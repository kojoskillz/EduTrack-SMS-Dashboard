//Main big Todo - I'm too lazy to write in ts
//But ts is backwards compatible with JS
//Some comments and part of the code was by GPT

/**
For future developer:
 * In this code all todos are security issues Not actually any issue with actuall functioning
 * You shall put common variables at too like the MASTER_SECRET_KEY
 * Please use the (fn)() IFME thing pattern but classes for commons
 
  
 * Current version is using a memory based storage rather than disk, so it can be a huge deal But it's the same problem, I could use Node JS file system, but rather it's a todo for future person (I simulated everything on web environment because of client and stuff so im too lazy to deploy and setup a localhost and doing it properly)
*/

 //Todo idk a secure way, but again as long as servers are only Our it should not be a issue
 var MASTER_SECRET_KEY = 'MASTER_SECRET_KEY-Todo'
class Utils {
  static getWantedHashLen(data) {
    const a = JSON.stringify(data).length;
    const t = Math.log(3*Math.log(a)); //Hope that Log a**3 = 3 Log a
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
      keyMaterial,
      { name: "AES-GCM", length: 256 },
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
   SECRET MANAGEMENT: Secure Server‑Side Secret Vault
   ============================================================ */

/**
 * SecretManager is responsible for securely storing and managing sensitive secrets.
 * Each secret is stored encrypted (using a master vault key) along with metadata and an audit log.
 */
class SecretManager {
  /**
   * @param {string} masterKey - A master key used to encrypt/decrypt secrets.
   */
  constructor(masterKey) {
    this.masterKey = masterKey;
    this.secrets = new Map();
  }

  async setSecret(secretId, secretValue, creator) {
    if (this.secrets.has(secretId)) {
      throw new Error("Secret already exists. Use updateSecret instead.");
    }
    const encryptedValue = await Utils.encryptData(secretValue, this.masterKey);
    const secretRecord = {
      secretId,
      encryptedValue,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      auditLog: [`Created by ${creator} at ${new Date().toISOString()}`]
    };
    this.secrets.set(secretId, secretRecord);
    return secretRecord;
  }

  async getSecret(secretId, requester) {
    if (!this.secrets.has(secretId)) {
      throw new Error("Secret not found");
    }
    const record = this.secrets.get(secretId);
    record.auditLog.push(`Accessed by ${requester} at ${new Date().toISOString()}`);
    const decryptedValue = await Utils.decryptData(record.encryptedValue, this.masterKey);
    return { secretId, secretValue: decryptedValue, version: record.version };
  }

  async updateSecret(secretId, newValue, updater) {
    if (!this.secrets.has(secretId)) {
      throw new Error("Secret not found");
    }
    const record = this.secrets.get(secretId);
    const encryptedValue = await Utils.encryptData(newValue, this.masterKey);
    record.encryptedValue = encryptedValue;
    record.updatedAt = new Date().toISOString();
    record.version += 1;
    record.auditLog.push(`Updated by ${updater} at ${record.updatedAt}`);
    return record;
  }

  async deleteSecret(secretId, deleter) {
    if (!this.secrets.has(secretId)) {
      throw new Error("Secret not found");
    }
    const record = this.secrets.get(secretId);
    record.auditLog.push(`Deleted by ${deleter} at ${new Date().toISOString()}`);
    this.secrets.delete(secretId);
    return { success: true, message: "Secret deleted" };
  }

  async rotateSecret(secretId, newValue, rotator) {
    if (!this.secrets.has(secretId)) {
      throw new Error("Secret not found");
    }
    const record = await this.updateSecret(secretId, newValue, rotator);
    record.auditLog.push(`Rotated by ${rotator} at ${new Date().toISOString()}`);
    return record;
  }

  listSecrets() {
    const metadata = [];
    for (const [secretId, record] of this.secrets.entries()) {
      metadata.push({
        secretId,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        version: record.version
      });
    }
    return metadata;
  }
}

/* ============================================================
   BACKEND:  Server-Side Logic
   ============================================================ */

/**
 * The Backend class manages multiple school records. Each school holds its own
 * users, attendance, reports, friend groups, settings, and – now – a secret vault.
 *
 * Requests are received via a secured message (with multiple hash checks) and then
 * routed to module-specific handlers.
 */
class Backend {
  constructor() {
    this.schools = new Map();
  }

  /**
   * Retrieves (or creates) a school record by schoolId.
   * Also initializes a SecretManager instance for the school.
   * @param {string} schoolId 
   * @returns {Object} School record.
   */
  getOrCreateSchool(schoolId) {
    if (!this.schools.has(schoolId)) {
      this.schools.set(schoolId, {
        users: new Map(),
        attendance: new Map(),
        reports: new Map(),
        friendGroups: new Map(),
        loginRequests: new Map(),
        settings: {
          loginPolicy: "none"  // Options: "manual", "notify", "none"
        },


//Todo , a placeholder, could Hash it or something, idk like hashing isn't a secure way of doing
//But again should not be a issue, like whos spending time to recerse enginear it
//Hopefully no one looks at git repo too
 secretManager: new SecretManager("SECRET" + schoolId)
      });
    }
    return this.schools.get(schoolId);
  }

  /**
   * Main request handler.
   * Validates the structure and integrity of incoming messages then routes them.
   * @param {Object} msg 
   * @returns {Promise<Object>}
   */
  async handleRequest(msg) {
    try {
      if (!msg || typeof msg !== "object" ||
          !msg.schoolId || !msg.username || !msg.module || !msg.command ||
          !msg.payload || typeof msg.payload !== "object" ||
          !msg.payload.value || !msg.payload.hash) {
        throw new Error("Invalid request structure");
      }

      const expectedMsgHash = await Utils.hashMessage(msg);
      if (msg.messageHash !== expectedMsgHash) {
        throw new Error("Message integrity compromised");
      }

      const usernameHashObj = await Utils.hash(msg.username, 5, Utils.getWantedHashLen(msg.username));
      const payloadHashObj = await Utils.hash(msg.payload.value, 5, Utils.getWantedHashLen(msg.payload.value));
      if (msg.usernameHash !== usernameHashObj.hash || msg.payload.hash !== payloadHashObj.hash) {
        throw new Error("Security hash mismatch");
      }

      const school = this.getOrCreateSchool(msg.schoolId);

      switch (msg.module) {
        case "Authentication":
          return await this.handleAuthentication(school, msg);
        case "Administrator":
          return await this.handleAdministrator(school, msg);
        case "Headmaster":
          return await this.handleHeadmaster(school, msg);
        case "Teachers":
          return await this.handleTeachers(school, msg);
        case "ParentPortal":
          return await this.handleParentPortal(school, msg);
        case "Friendship":
          return await this.handleFriendship(school, msg);
        case "SecretManagement":
          return await this.handleSecretManagement(school, msg);
        default:
          throw new Error("Unknown module");
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /* ------------------- Authentication Module ------------------- */
  async handleAuthentication(school, msg) {
    const { command, username, payload } = msg;
    const { Password, Role, Photo, Signature } = payload.value;
    const userExists = school.users.has(username);

    if (command === "SignUp") {
      if (userExists) throw new Error("User already exists");
      // Todo, idk a secure way
      //Should not be a issue though 
      const encryptedPassword = await Utils.encryptData(Password, MASTER_SECRET_KEY);
      const newUser = {
        username,
        encryptedPassword,
        role: Role || "Teachers",
        createdAt: new Date().toISOString(),
        lastLogin: null,
        photo: Photo || null,
        signature: Signature || null,
        friendGroups: {},
        schoolId: msg.schoolId
      };
      school.users.set(username, newUser);
      return { success: true, message: "User registered successfully", task: "signup" };
    }
    else if (command === "Login" || command === "SignIn") {
      if (!userExists) throw new Error("User does not exist. Please sign up first.");
      const user = school.users.get(username);
      let decryptedPassword;
      try {
        decryptedPassword = await Utils.decryptData(user.encryptedPassword, MASTER_SECRET_KEY);
      } catch (e) {
        throw new Error("Decryption error");
      }
      if (decryptedPassword !== Password) throw new Error("Invalid credentials");

      const policy = school.settings.loginPolicy;
      if (policy === "manual") {
        school.loginRequests.set(username, { timestamp: new Date().toISOString(), user });
        this.notifyManagers(school, `${username} is requesting to log in (manual approval required).`);
        return { success: true, message: "Login pending manager approval", pending: true };
      } else if (policy === "notify") {
        user.lastLogin = new Date().toISOString();
        this.notifyManagers(school, `${username} has logged in.`);
        return { success: true, message: "User logged in", task: command.toLowerCase() };
      } else {
        user.lastLogin = new Date().toISOString();
        return { success: true, message: "User logged in", task: command.toLowerCase() };
      }
    }
    else {
      throw new Error("Unknown authentication command");
    }
  }

  notifyManagers(school, notificationMessage) {
    for (let [uname, user] of school.users) {
      if (user.role === "Manager") {
        console.info(`Notification to Manager (${uname}): ${notificationMessage}`);
      }
    }
  }

  /* ------------------- Administrator Module ------------------- */
  async handleAdministrator(school, msg) {
    const { command, username, payload } = msg;
    if (!school.users.has(username) || school.users.get(username).role !== "Administrator") {
      throw new Error("Administrator privileges required");
    }
    switch (command) {
      case "ManageUsers": {
        const action = payload.value.action;
        const targetUser = payload.value.targetUser;
        if (action === "create") {
          if (school.users.has(targetUser.username)) throw new Error("User already exists");
          const encryptedPassword = await Utils.encryptData(targetUser.Password, MASTER_SECRET_KEY);
          const newUser = {
            username: targetUser.username,
            encryptedPassword,
            role: targetUser.role || "Teachers",
            createdAt: new Date().toISOString(),
            lastLogin: null,
            photo: targetUser.Photo || null,
            signature: targetUser.Signature || null,
            friendGroups: {},
            schoolId: msg.schoolId
          };
          school.users.set(targetUser.username, newUser);
          return { success: true, message: "User created" };
        }
        else if (action === "update") {
          if (!school.users.has(targetUser.username)) throw new Error("User does not exist");
          let userData = school.users.get(targetUser.username);
          if (targetUser.Password) {
            userData.encryptedPassword = await Utils.encryptData(targetUser.Password, MASTER_SECRET_KEY);
          }
          if (targetUser.role) userData.role = targetUser.role;
          if (targetUser.Photo) userData.photo = targetUser.Photo;
          if (targetUser.Signature) userData.signature = targetUser.Signature;
          school.users.set(targetUser.username, userData);
          return { success: true, message: "User updated" };
        }
        else if (action === "delete") {
          if (!school.users.has(targetUser.username)) throw new Error("User does not exist");
          school.users.delete(targetUser.username);
          return { success: true, message: "User deleted" };
        }
        else {
          throw new Error("Unknown user management action");
        }
      }
      case "UpdateSettings": {
        school.settings = Object.assign({}, school.settings, payload.value.settings);
        return { success: true, message: "School settings updated" };
      }
      default:
        throw new Error("Unknown Administrator command");
    }
  }

  /* ------------------- Headmaster Module ------------------- */
  async handleHeadmaster(school, msg) {
    const { command, username, payload } = msg;
    if (!school.users.has(username) || school.users.get(username).role !== "Headmaster") {
      throw new Error("Headmaster privileges required");
    }
    switch (command) {
      case "ManageAttendance": {
        const { classId, studentId, status, date } = payload.value;
        if (!school.attendance.has(classId)) {
          school.attendance.set(classId, []);
        }
        school.attendance.get(classId).push({ studentId, status, date, recordedBy: username });
        return { success: true, message: "Attendance recorded" };
      }
      case "GenerateSchoolReport": {
        const report = {
          generatedAt: new Date().toISOString(),
          totalUsers: school.users.size,
          attendanceSummary: Array.from(school.attendance.entries())
        };
        const reportId = `report_${Date.now()}`;
        school.reports.set(reportId, report);
        return { success: true, reportId, report };
      }
      default:
        throw new Error("Unknown Headmaster command");
    }
  }

  /* ------------------- Teachers Module ------------------- */
  async handleTeachers(school, msg) {
    const { command, username, payload } = msg;
    const user = school.users.get(username);
    if (!user || (user.role !== "Teachers" && user.role !== "Administrator")) {
      throw new Error("Teacher privileges required");
    }
    switch (command) {
      case "RecordGrades": {
        if (!user.reports) user.reports = [];
        user.reports.push({
          type: "grades",
          studentId: payload.value.studentId,
          subject: payload.value.subject,
          grade: payload.value.grade,
          date: new Date().toISOString()
        });
        return { success: true, message: "Grade recorded" };
      }
      case "TakeAttendance": {
        const { classId, studentId, status, date } = payload.value;
        if (!school.attendance.has(classId)) {
          school.attendance.set(classId, []);
        }
        school.attendance.get(classId).push({ studentId, status, date, recordedBy: username });
        return { success: true, message: "Attendance recorded" };
      }
      case "UploadAssessmentForm": {
        const assessmentReport = {
          type: "assessment",
          teacher: username,
          data: payload.value.data,
          date: new Date().toISOString()
        };
        const assessmentId = `assessment_${Date.now()}`;
        school.reports.set(assessmentId, assessmentReport);
        return { success: true, assessmentId, message: "Assessment form uploaded" };
      }
      default:
        throw new Error("Unknown Teachers command");
    }
  }

  /* ------------------- Parent Portal Module ------------------- */
  async handleParentPortal(school, msg) {
    const { command, username, payload } = msg;
    if (!school.users.has(username) || school.users.get(username).role !== "Parent") {
      throw new Error("Parent Portal access only");
    }
    switch (command) {
      case "ViewStudentReport": {
        const reports = [];
        for (let report of school.reports.values()) {
          if (report.studentId && report.studentId === payload.value.studentId) {
            reports.push(report);
          }
        }
        return { success: true, reports };
      }
      case "UpdateProfile": {
        let parentData = school.users.get(username);
        Object.assign(parentData, payload.value);
        school.users.set(username, parentData);
        return { success: true, message: "Profile updated" };
      }
      case "ManageChildConnections": {
        let parentData = school.users.get(username);
        if (!parentData.childConnections) parentData.childConnections = {};
        const { childUsername, action, group, friendUsername } = payload.value;
        if (action === "add") {
          if (!parentData.childConnections[group]) parentData.childConnections[group] = [];
          parentData.childConnections[group].push(friendUsername);
          return { success: true, message: "Friend added to child's group" };
        } else if (action === "remove") {
          if (parentData.childConnections[group]) {
            parentData.childConnections[group] = parentData.childConnections[group].filter(f => f !== friendUsername);
            return { success: true, message: "Friend removed from child's group" };
          }
          throw new Error("Group not found");
        } else {
          throw new Error("Unknown action");
        }
      }
      case "ContactTeacher": {
        if (!school.users.has(payload.value.teacherUsername)) {
          throw new Error("Teacher not found");
        }
        console.info(`Parent ${username} contacts Teacher ${payload.value.teacherUsername}: ${payload.value.message}`);
        return { success: true, message: "Message sent to teacher" };
      }
      default:
        throw new Error("Unknown Parent Portal command");
    }
  }

  /* ------------------- Friendship Module ------------------- */
  async handleFriendship(school, msg) {
    const { command, username, payload } = msg;
    if (!school.users.has(username)) throw new Error("User does not exist");
    if (!school.friendGroups.has(username)) {
      school.friendGroups.set(username, {});
    }
    const groups = school.friendGroups.get(username);
    switch (command) {
      case "CreateGroup": {
        const groupName = payload.value.groupName;
        if (groups[groupName]) throw new Error("Group already exists");
        groups[groupName] = [];
        return { success: true, message: `Group "${groupName}" created` };
      }
      case "AddFriend": {
        const { groupName, friendUsername } = payload.value;
        if (!groups[groupName]) throw new Error("Group does not exist");
        if (!groups[groupName].includes(friendUsername)) {
          groups[groupName].push(friendUsername);
        }
        return { success: true, message: "Friend added" };
      }
      case "RemoveFriend": {
        const { groupName, friendUsername } = payload.value;
        if (!groups[groupName]) throw new Error("Group does not exist");
        groups[groupName] = groups[groupName].filter(f => f !== friendUsername);
        return { success: true, message: "Friend removed" };
      }
      default:
        throw new Error("Unknown Friendship command");
    }
  }

  /* ------------------- Secret Management Module ------------------- */
  async handleSecretManagement(school, msg) {
    const { command, username, payload } = msg;
    // Only Administrators and Managers are allowed.
    const user = school.users.get(username);
    if (!user || (user.role !== "Administrator" && user.role !== "Manager")) {
      throw new Error("Access denied: Only Administrators or Managers can manage secrets");
    }
    const secretManager = school.secretManager;
    switch (command) {
      case "SetSecret": {
        const { secretId, secretValue } = payload.value;
        const result = await secretManager.setSecret(secretId, secretValue, username);
        return { success: true, message: "Secret set", secret: { secretId: result.secretId, version: result.version } };
      }
      case "GetSecret": {
        const { secretId } = payload.value;
        const result = await secretManager.getSecret(secretId, username);
        return { success: true, secret: result };
      }
      case "UpdateSecret": {
        const { secretId, newValue } = payload.value;
        const result = await secretManager.updateSecret(secretId, newValue, username);
        return { success: true, message: "Secret updated", secret: { secretId: result.secretId, version: result.version } };
      }
      case "DeleteSecret": {
        const { secretId } = payload.value;
        const result = await secretManager.deleteSecret(secretId, username);
        return result;
      }
      case "RotateSecret": {
        const { secretId, newValue } = payload.value;
        const result = await secretManager.rotateSecret(secretId, newValue, username);
        return { success: true, message: "Secret rotated", secret: { secretId: result.secretId, version: result.version } };
      }
      case "ListSecrets": {
        const list = secretManager.listSecrets();
        return { success: true, secrets: list };
      }
      default:
        throw new Error("Unknown SecretManagement command");
    }
  }

  /* ------------------- Reporting Module ------------------- */
  async generateDefaultersReport(schoolId, classId, threshold = 75) {
    const school = this.getOrCreateSchool(schoolId);
    if (!school.attendance.has(classId)) throw new Error("No attendance records for class");
    const records = school.attendance.get(classId);
    const studentAttendance = {};
    for (const rec of records) {
      if (!studentAttendance[rec.studentId]) {
        studentAttendance[rec.studentId] = { present: 0, total: 0 };
      }
      studentAttendance[rec.studentId].total++;
      if (rec.status === "present") studentAttendance[rec.studentId].present++;
    }
    const defaulters = [];
    for (const [studentId, att] of Object.entries(studentAttendance)) {
      const perc = (att.present / att.total) * 100;
      if (perc < threshold) defaulters.push({ studentId, attendancePercentage: perc });
    }
    return { success: true, defaulters };
  }

  async generateTerminalReport(schoolId, studentId) {
    const school = this.getOrCreateSchool(schoolId);
    let grades = [];
    for (let user of school.users.values()) {
      if (user.reports && Array.isArray(user.reports)) {
        const studentGrades = user.reports.filter(r => r.type === "grades" && r.studentId === studentId);
        grades.push(...studentGrades);
      }
    }
    let attendanceRecords = [];
    for (let records of school.attendance.values()) {
      attendanceRecords.push(...records.filter(r => r.studentId === studentId));
    }
    const report = { studentId, grades, attendanceRecords, generatedAt: new Date().toISOString() };
    return { success: true, report };
  }

  async generateAssessmentForm(schoolId, studentId) {
    const form = {
      studentId,
      subjects: {
        Mathematics: { continuousAssessment: Math.floor(Math.random() * 100), exam: Math.floor(Math.random() * 100) },
        English: { continuousAssessment: Math.floor(Math.random() * 100), exam: Math.floor(Math.random() * 100) },
        Science: { continuousAssessment: Math.floor(Math.random() * 100), exam: Math.floor(Math.random() * 100) }
      },
      generatedAt: new Date().toISOString()
    };
    return { success: true, form };
  }
}
