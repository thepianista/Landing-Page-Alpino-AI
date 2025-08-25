import Image, { StaticImageData } from 'next/image';

interface FeatureCardProps {
  title: string;
  text: string;
  image: StaticImageData;
}

const FeatureCard = ({ title, text, image }: FeatureCardProps) => {
  return (
    <div className="bg-white rounded-lg shadow-[0_8px_60px_rgba(0,0,0,0.08)] p-2">
      <div className="bg-gray-50 rounded-xl flex items-center justify-center mb-6">
        <Image src={image} alt={title} className="object-contain w-auto h-auto opacity-80" />
      </div>
      <div className="flex flex-col text-start pt-2 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-500">{text}</p>
      </div>
    </div>
  );
};

export default FeatureCard;
