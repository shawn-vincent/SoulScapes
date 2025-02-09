class LocalAvatarManager {
  constructor() {
    const savedAvatar = JSON.parse(localStorage.getItem("localAvatar")) || {};

    this.avatar = {
      id: null,
      name: savedAvatar.name || "Anonymous",
      mood: savedAvatar.mood || "neutral",
      color: savedAvatar.color || "#00f",
      image: savedAvatar.image || null,
      videoEnabled: savedAvatar.videoEnabled || false,
      audioEnabled: savedAvatar.audioEnabled || false,
    };

    console.log(`[${new Date().toISOString()}] 🎭 Loaded local avatar`, this.avatar);
  }

  setAvatarData({ name, mood, color, image }) {
    if (name) this.avatar.name = name;
    if (mood) this.avatar.mood = mood;
    if (color) this.avatar.color = color;
    if (image) this.avatar.image = image;
    this.saveToStorage();
  }

  saveToStorage() {
    localStorage.setItem("localAvatar", JSON.stringify(this.avatar));
    console.log(`[${new Date().toISOString()}] 💾 Avatar saved to storage`, this.avatar);
  }

  getAvatarData() {
    return this.avatar;
  }
}

const localAvatarManager = new LocalAvatarManager();
export default localAvatarManager;
