
import * as faceapi from 'face-api.js';

// Configuration
const MODEL_URL = '/models';

export const loadFaceApiModels = async () => {
  try {
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    ]);
    console.log("FaceAPI Models Loaded");
    return true;
  } catch (error) {
    console.error("Failed to load FaceAPI models", error);
    return false;
  }
};

export const getFaceDescriptor = async (videoOrImage: HTMLVideoElement | HTMLImageElement) => {
  const detection = await faceapi.detectSingleFace(videoOrImage).withFaceLandmarks().withFaceDescriptor();
  if (!detection) {
    return null;
  }
  return detection.descriptor;
};

export const createFaceMatcher = (users: any[]) => {
  const labeledDescriptors = users
    .filter(user => user.face_descriptor && Array.isArray(user.face_descriptor))
    .map(user => {
      const descriptor = new Float32Array(user.face_descriptor);
      return new faceapi.LabeledFaceDescriptors(user.id, [descriptor]);
    });

  if (labeledDescriptors.length === 0) return null;
  
  return new faceapi.FaceMatcher(labeledDescriptors, 0.6); // 0.6 distance threshold
};
