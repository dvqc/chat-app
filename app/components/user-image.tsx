import { getUserImgSrc } from '#app/utils/misc'

export default function UserImage({
	imageId,
	alt,
}: {
	imageId?: string | null
	alt?: string | null
}) {
	return (
		<img
			className="h-10 w-10 rounded object-cover"
			src={getUserImgSrc(imageId)}
			alt={alt ?? 'user profile picture'}
		/>
	)
}
