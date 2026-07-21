export const DEFAULT_LEARNER_AVATAR_ID = "little-girl";

export const LEARNER_AVATARS = Object.freeze([
  learnerAvatar({
    id: "little-girl",
    name: "Little Girl",
    asset: "/assets/characters/learner-girl.glb",
    model: "tripo-little-girl-static-v1",
    height: 1.48,
    rotationY: 0,
    motionMode: "procedural-limbs",
    motionProfile: {
      legUpperY: -0.42,
      legBlendWidth: 0.1,
      legSwingScale: 0.55,
      kneeBendScale: 0.35,
      armSwingScale: 0,
      elbowBendScale: 0,
      bobScale: 0.35,
      leanScale: 0.35,
      footSeparation: 0,
      maxSpeed: 1.33
    }
  }),
  learnerAvatar({
    id: "original",
    name: "Original Learner",
    asset: "/assets/characters/learner.glb",
    model: "gpt-image-2-tripo-v3.1-rig-v1",
    height: 1.76,
    rotationY: -Math.PI / 2,
    motionMode: "skeletal",
    sourceGradeSkinWeights: true
  })
]);

export function getLearnerAvatar(id) {
  return LEARNER_AVATARS.find((avatar) => avatar.id === id) || null;
}

function learnerAvatar({ sourceGradeSkinWeights = false, motionProfile = null, ...avatar }) {
  return Object.freeze({
    ...avatar,
    motionProfile: motionProfile ? Object.freeze({ ...motionProfile }) : null,
    sourceGradeSkinWeights
  });
}
