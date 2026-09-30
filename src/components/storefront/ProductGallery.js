import GalleryImage from "./GalleryImage";

// Two-column photo grid, in the order the admin arranged the product media.
export default function ProductGallery({ images, title }) {
  if (images.length === 0) {
    return (
      <div className="w-full lg:w-[55%]">
        <div className="bg-[#F8F8F8] rounded-md aspect-[4/3] flex items-center justify-center text-sm text-gray-400">
          No image available
        </div>
      </div>
    );
  }

  return (
    <div className="w-full lg:w-[55%] grid grid-cols-2 gap-4 content-start">
      {images.map((src, index) => (
        <GalleryImage
          key={`${src}-${index}`}
          src={src}
          alt={index === 0 ? title : `${title} – view ${index + 1}`}
          eager={index < 2}
          className={images.length === 1 ? "col-span-2" : ""}
        />
      ))}
    </div>
  );
}
