// Very bad code and use of gpt in some parts
// ts is reverse compatible with JS
//I was too lazy to write ts

/* ============================================================
   UTILS: Dynamic Hashing and Encryption Utilities
   ============================================================ */

/**
 * Utils class provides:
 *  – A dynamic hash function (recursive SHA‑256) to compute field hashes.
 *  – A function to compute an overall message hash.
 *  – AES‑GCM encryption/decryption functions (using PBKDF2 key derivation).
 */
class Utils {
  static getWantedHashLen(data) {
    const a = JSON.stringify(data).length;
    const t = Math.log(3 * Math.log(a)); //Hope that Log a**3 = 3 Log a
    const y = (a - t) / (t ** t);
    return Math.round(y) + 9;
  }
  
  static async hash(data, maxDepth = 15, length = 32, depth = 0) {
    const encoder = new TextEncoder();
    const jsonString = JSON.stringify(data);
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(jsonString));
    const hashArray = Array.from(new Uint8Array(buffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
    const truncatedHash = hashHex.slice(0, length);
    const result = {
      hash: truncatedHash,
      previous: jsonString.slice(0, length),
      time: (new Date().getFullYear() - 622) / 0.97,
      depth: depth
    };
    if (depth >= maxDepth) return result;
    return await Utils.hash(result, maxDepth, length, depth + 1);
  }
  
  static async hashMessage(message) {
    const clone = { ...message };
    delete clone.messageHash;
    const encoder = new TextEncoder();
    const jsonString = JSON.stringify(clone);
    const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(jsonString));
    const hashArray = Array.from(new Uint8Array(buffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  }
  
  static async deriveKey(password, salt) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: salt,
        iterations: 100000,
        hash: "SHA-256"
      },
      keyMaterial, { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }
  
  static async encryptData(plainText, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await Utils.deriveKey(password, salt);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(plainText);
    const ciphertextBuffer = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, encoded);
    const combined = new Uint8Array(salt.byteLength + iv.byteLength + ciphertextBuffer.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.byteLength);
    combined.set(new Uint8Array(ciphertextBuffer), salt.byteLength + iv.byteLength);
    return btoa(String.fromCharCode(...combined));
  }
  
  static async decryptData(cipherText, password) {
    const combined = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const data = combined.slice(28);
    const key = await Utils.deriveKey(password, salt);
    const decryptedBuffer = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv }, key, data);
    return new TextDecoder().decode(decryptedBuffer);
  }
}


/* ============================================================
   CLIENTSIDE: Secure Client-Side Module (Micro-library)
   ============================================================ */

/**
 * The ClientSide class prepares secure messages (computing per‑field and overall hashes)
 * and sends them to the backend. Although the client side is publicly accessible,
 * secret management commands will only succeed if the server-side checks pass.
 */
const ClientSide = (function() {
  const _backend = Symbol("backend");
  
  class ClientSide {
    constructor(backendInstance, clientSecret = "CLIENT_DEFAULT_SECRET") {
      this[_backend] = backendInstance;
      this.clientSecret = clientSecret;
    }
    
    async sendRequest(schoolId, module, command, username, payloadValue) {
      const usernameHashObj = await Utils.hash(username, 5, Utils.getWantedHashLen(username));
      const payloadHashObj = await Utils.hash(payloadValue, 5, Utils.getWantedHashLen(payloadValue));
      let msg = {
        schoolId,
        module,
        command,
        username,
        usernameHash: usernameHashObj.hash,
        payload: {
          hash: payloadHashObj.hash,
          value: payloadValue
        }
      };
      msg.messageHash = await Utils.hashMessage(msg);
      
      
      // This is a placeholder   Todo
      //Todo : Act connect the rest of the code
      //this is for sake of testing and development
      const response = await this[_backend].handleRequest(msg);
      
      
      console.info(`Response (${schoolId} | ${module}/${command}):`, response);
      return response;
    }
    
    /* ---------- Authentication ---------- */
    async signUp(schoolId, username, password, role, photo = null, signature = null) {
      const payload = { Password: password, Role: role, Photo: photo, Signature: signature };
      return await this.sendRequest(schoolId, "Authentication", "SignUp", username, payload);
    }
    async login(schoolId, username, password) {
      const payload = { Password: password };
      return await this.sendRequest(schoolId, "Authentication", "Login", username, payload);
    }
    async signIn(schoolId, username, password) {
      const payload = { Password: password };
      return await this.sendRequest(schoolId, "Authentication", "SignIn", username, payload);
    }
    
    /* ---------- Administrator ---------- */
    async manageUsers(schoolId, adminUsername, action, targetUser) {
      const payload = { action, targetUser };
      return await this.sendRequest(schoolId, "Administrator", "ManageUsers", adminUsername, payload);
    }
    async updateSettings(schoolId, adminUsername, settings) {
      const payload = { settings };
      return await this.sendRequest(schoolId, "Administrator", "UpdateSettings", adminUsername, payload);
    }
    
    /* ---------- Headmaster ---------- */
    async manageAttendance(schoolId, headmasterUsername, classId, studentId, status, date = new Date().toISOString()) {
      const payload = { classId, studentId, status, date };
      return await this.sendRequest(schoolId, "Headmaster", "ManageAttendance", headmasterUsername, payload);
    }
    async generateSchoolReport(schoolId, headmasterUsername) {
      return await this.sendRequest(schoolId, "Headmaster", "GenerateSchoolReport", headmasterUsername, {});
    }
    
    /* ---------- Teachers ---------- */
    async recordGrades(schoolId, teacherUsername, studentId, subject, grade) {
      const payload = { studentId, subject, grade };
      return await this.sendRequest(schoolId, "Teachers", "RecordGrades", teacherUsername, payload);
    }
    async takeAttendance(schoolId, teacherUsername, classId, studentId, status, date = new Date().toISOString()) {
      const payload = { classId, studentId, status, date };
      return await this.sendRequest(schoolId, "Teachers", "TakeAttendance", teacherUsername, payload);
    }
    async uploadAssessmentForm(schoolId, teacherUsername, assessmentData) {
      const payload = { data: assessmentData };
      return await this.sendRequest(schoolId, "Teachers", "UploadAssessmentForm", teacherUsername, payload);
    }
    
    /* ---------- Parent Portal ---------- */
    async viewStudentReport(schoolId, parentUsername, studentId) {
      const payload = { studentId };
      return await this.sendRequest(schoolId, "ParentPortal", "ViewStudentReport", parentUsername, payload);
    }
    async updateProfile(schoolId, parentUsername, profileData) {
      return await this.sendRequest(schoolId, "ParentPortal", "UpdateProfile", parentUsername, profileData);
    }
    async manageChildConnections(schoolId, parentUsername, childUsername, action, group, friendUsername) {
      const payload = { childUsername, action, group, friendUsername };
      return await this.sendRequest(schoolId, "ParentPortal", "ManageChildConnections", parentUsername, payload);
    }
    async contactTeacher(schoolId, parentUsername, teacherUsername, message) {
      const payload = { teacherUsername, message };
      return await this.sendRequest(schoolId, "ParentPortal", "ContactTeacher", parentUsername, payload);
    }
    
    /* ---------- Friendship ---------- */
    async createFriendGroup(schoolId, username, groupName) {
      const payload = { groupName };
      return await this.sendRequest(schoolId, "Friendship", "CreateGroup", username, payload);
    }
    async addFriend(schoolId, username, groupName, friendUsername) {
      const payload = { groupName, friendUsername };
      return await this.sendRequest(schoolId, "Friendship", "AddFriend", username, payload);
    }
    async removeFriend(schoolId, username, groupName, friendUsername) {
      const payload = { groupName, friendUsername };
      return await this.sendRequest(schoolId, "Friendship", "RemoveFriend", username, payload);
    }
    
    /* ---------- Secret Management ---------- */
    async setSecret(schoolId, username, secretId, secretValue) {
      const payload = { secretId, secretValue };
      return await this.sendRequest(schoolId, "SecretManagement", "SetSecret", username, payload);
    }
    async getSecret(schoolId, username, secretId) {
      const payload = { secretId };
      return await this.sendRequest(schoolId, "SecretManagement", "GetSecret", username, payload);
    }
    async updateSecret(schoolId, username, secretId, newValue) {
      const payload = { secretId, newValue };
      return await this.sendRequest(schoolId, "SecretManagement", "UpdateSecret", username, payload);
    }
    async deleteSecret(schoolId, username, secretId) {
      const payload = { secretId };
      return await this.sendRequest(schoolId, "SecretManagement", "DeleteSecret", username, payload);
    }
    async rotateSecret(schoolId, username, secretId, newValue) {
      const payload = { secretId, newValue };
      return await this.sendRequest(schoolId, "SecretManagement", "RotateSecret", username, payload);
    }
    async listSecrets(schoolId, username) {
      return await this.sendRequest(schoolId, "SecretManagement", "ListSecrets", username, {});
    }
    
    /* ---------- Reporting ---------- */
    async generateDefaultersReport(schoolId, classId, threshold = 75) {
      return await this[_backend].generateDefaultersReport(schoolId, classId, threshold);
    }
    async generateTerminalReport(schoolId, studentId) {
      return await this[_backend].generateTerminalReport(schoolId, studentId);
    }
    async generateAssessmentForm(schoolId, studentId) {
      return await this[_backend].generateAssessmentForm(schoolId, studentId);
    }
  }
  
  return ClientSide;
})();
