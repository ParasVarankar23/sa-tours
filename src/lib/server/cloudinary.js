import { v2 as cloudinary } from "cloudinary";

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
    console.warn(
        "Cloudinary env vars missing: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET"
    );
}

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
});

export async function uploadBufferToCloudinary(buffer, folder = "college/departments") {
    const base64 = buffer.toString("base64");
    const dataUri = `data:image/jpeg;base64,${base64}`;

    return cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: "image",
    });
}

export async function uploadAssetToCloudinary({
    buffer,
    folder,
    mimeType,
    resourceType = "auto",
}) {
    const lowerMimeType = String(mimeType || "").toLowerCase();
    let resolvedResourceType = resourceType;

    if (resourceType === "auto") {
        if (lowerMimeType.startsWith("image/")) {
            resolvedResourceType = "image";
        } else if (lowerMimeType.startsWith("video/")) {
            resolvedResourceType = "video";
        } else {
            resolvedResourceType = "raw";
        }
    }

    const base64 = buffer.toString("base64");
    const dataUri = `data:${mimeType};base64,${base64}`;

    return cloudinary.uploader.upload(dataUri, {
        folder,
        resource_type: resolvedResourceType,
    });
}

export async function deleteCloudinaryAsset(publicId, resourceType = "image") {
    if (!publicId) return;

    await cloudinary.uploader.destroy(publicId, {
        invalidate: true,
        resource_type: resourceType,
    });
}

export async function deleteCloudinaryImage(publicId) {
    return deleteCloudinaryAsset(publicId, "image");
}

