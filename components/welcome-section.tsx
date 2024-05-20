type WelcomeSectionProps = {
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function WelcomeSection({
  handleFileChange,
}: WelcomeSectionProps) {
  return (
    <div className="h-full flex justify-center items-center flex-col">
      <h2 className="text-5xl font-bold mb-4">Audio Cutter</h2>
      <p className="text-2xl">
        Free editor to trim and cut any audio file online
      </p>

      <div className="mt-5">
        <label htmlFor="input">
          <input
            type="file"
            accept="audio/*"
            id="input"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white cursor-pointer rounded-full p-1">
            <span className="flex w-full px-6 bg-main hover:bg-purple-500/40 transition-colors duration-100 ease-out text-white rounded-full py-2">
              Browse my files
            </span>
          </div>
        </label>
      </div>
    </div>
  );
}
