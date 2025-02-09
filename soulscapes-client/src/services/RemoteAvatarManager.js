class RemoteAvatarManager {
  constructor() {
    this.avatars = {};
    console.log(`[${new Date().toISOString()}] 📡 Remote avatar manager initialized`);
  }

  addUser(id, avatarData) {
    this.avatars[id] = avatarData;
    console.log(`[${new Date().toISOString()}] ➕ User ${id} joined`, avatarData);
  }

  removeUser(id) {
    delete this.avatars[id];
    console.log(`[${new Date().toISOString()}] ❌ User ${id} left`);
  }

  refreshAllUsers(userList) {
    this.avatars = {};
    userList.forEach(({ id, avatar }) => this.addUser(id, avatar));
    console.log(`[${new Date().toISOString()}] 🔄 Refreshed remote avatars`, this.avatars);
  }

  getAllAvatars() {
    return this.avatars;
  }
}

const remoteAvatarManager = new RemoteAvatarManager();
export default remoteAvatarManager;
