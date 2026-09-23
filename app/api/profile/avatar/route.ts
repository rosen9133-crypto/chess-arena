import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const AVATAR_BUCKET = "avatars";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const FILE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("avatar");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Please choose an image." },
      { status: 400 },
    );
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Avatar must be a JPG, PNG, or WebP image." },
      { status: 400 },
    );
  }

  if (file.size <= 0) {
    return NextResponse.json(
      { error: "The selected image is empty." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Avatar must be 5 MB or smaller." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const extension = FILE_EXTENSIONS[file.type];
  const filePath = `${user.id}/avatar-${crypto.randomUUID()}.${extension}`;
  const bytes = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from(AVATAR_BUCKET)
    .upload(filePath, bytes, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    console.error("Avatar upload failed:", uploadError);
    return NextResponse.json(
      { error: "Could not upload avatar." },
      { status: 500 },
    );
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(AVATAR_BUCKET).getPublicUrl(filePath);

  try {
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: publicUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    if (user.avatarUrl) {
      const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
      const markerIndex = user.avatarUrl.indexOf(marker);

      if (markerIndex !== -1) {
        const oldFilePath = decodeURIComponent(
          user.avatarUrl.slice(markerIndex + marker.length),
        );

        if (oldFilePath && oldFilePath !== filePath) {
          const { error: removeError } = await supabaseAdmin.storage
            .from(AVATAR_BUCKET)
            .remove([oldFilePath]);

          if (removeError) {
            console.error("Old avatar removal failed:", removeError);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error) {
    await supabaseAdmin.storage.from(AVATAR_BUCKET).remove([filePath]);
    console.error("Avatar database update failed:", error);

    return NextResponse.json(
      { error: "Could not save avatar." },
      { status: 500 },
    );
  }
}
