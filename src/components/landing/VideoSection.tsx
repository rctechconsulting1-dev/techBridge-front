import VideoPlayer from "./VideoPlayer";

const VideoSection = () => {
  return (
    <section className="bg-white py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            See <span className="text-[#CD7F32]">RD TechBridge</span> in Action
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            A quick look at how we help businesses eliminate tech debt and
            grow with automation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <VideoPlayer
            src="https://techconsulting-rc.s3.us-west-1.amazonaws.com/assets/RD+Tech+Bridge_+Eliminate+Tech+Debt_1080p_caption.mp4"
            caption="Eliminate Tech Debt"
          />
          <VideoPlayer
            src="https://techconsulting-rc.s3.us-west-1.amazonaws.com/assets/RD+Tech+Bridge+-+Automatizaci%C3%B3n+de+Negocios+(Espa%C3%B1ol)_1080p.mp4"
            caption="Automatización de Negocios"
            langLabel="Ver en Español"
          />
        </div>
      </div>
    </section>
  );
};

export default VideoSection;
