class ProfileManager {
    constructor(profilesData) {
        this.profiles = profilesData;
    }

    getProfileNames() {
        const allProfiles = [];
        for (const type in this.profiles) {
            allProfiles.push(...Object.keys(this.profiles[type]));
        }
        allProfiles.sort();
        return allProfiles;
    }

    getProfile(name) {
        for (const type in this.profiles) {
            if (this.profiles[type][name]) {
                return this.profiles[type][name];
            }
        }
        console.warn(`Profile ${name} not found.`);
        return null;
    }
} 