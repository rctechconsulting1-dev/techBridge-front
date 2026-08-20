interface VideoPlayerProps {
  src: string;
  caption: string;
  langLabel?: string;
}

const VideoPlayer = ({ src, caption, langLabel }: VideoPlayerProps) => {
  return (
    <div className="rounded-2xl overflow-hidden shadow-xl border-2 border-gray-200 bg-black">
      <div className="aspect-video">
        <video
          className="w-full h-full"
          controls
          playsInline
          preload="metadata"
        >
          <source src={src} type="video/mp4" />
        </video>
      </div>
      <div className="bg-white px-5 py-4 flex items-center justify-between gap-3">
        <p className="font-semibold text-gray-900">{caption}</p>
        {langLabel && (
          <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-[#CD7F32] bg-[#CD7F32]/10 px-2.5 py-1 rounded-full">
            {langLabel}
          </span>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
