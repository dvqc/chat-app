import { getUserImgSrc } from "#app/utils/misc";

export default function UserImage({ imageId, alt }: { imageId?: string | null, alt?: string | null }) {
    return <img
        className="w-10 h-10 object-cover rounded"
        src={getUserImgSrc(imageId)}
        alt={alt ?? 'user profile picture'}
    />
}
