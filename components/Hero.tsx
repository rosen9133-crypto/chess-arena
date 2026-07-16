export default function Hero() {
  return (
    <section className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <p className="mb-4 text-sm uppercase tracking-[0.3em] text-yellow-400">
          Welcome to Chess Arena
        </p>

        <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
          Play Like a King.
          <span className="block text-yellow-400">
            Think Like a Champion.
          </span>
        </h1>

        <p className="mt-8 max-w-2xl text-lg text-gray-300">
          Challenge players from around the world, improve your skills with AI
          analysis and become part of the next generation chess community.
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <button className="rounded-lg bg-yellow-400 px-8 py-4 font-bold text-black transition hover:bg-yellow-300">
            ♟ Play Now
          </button>

          <button className="rounded-lg border border-yellow-400 px-8 py-4 font-bold text-white transition hover:bg-yellow-400 hover:text-black">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}