const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
  

    function convertToSeconds(time) {
        let parts = time.split(" ");
        let timePart = parts[0];
        let period = parts[1];

        let t = timePart.split(":");
        let hours = parseInt(t[0]);
        let minutes = parseInt(t[1]);
        let seconds = parseInt(t[2]);

        if (period === "pm" && hours !== 12) {
            hours += 12;
        }
        if (period === "am" && hours === 12) {
            hours = 0;
        }

        return hours * 3600 + minutes * 60 + seconds;
    }

    let startSeconds = convertToSeconds(startTime);
    let endSeconds = convertToSeconds(endTime);

    let diff = endSeconds - startSeconds;
    if (diff < 0) diff += 24 * 3600;

    let hours = Math.floor(diff / 3600);
    let minutes = Math.floor((diff % 3600) / 60);
    let seconds = diff % 60;

    minutes = String(minutes).padStart(2, '0');
    seconds = String(seconds).padStart(2, '0');

    return hours + ":" + minutes + ":" + seconds;
}


// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {

    function convertToSeconds(time) {
        let parts = time.split(" ");
        let timePart = parts[0];
        let period = parts[1];

        let t = timePart.split(":");
        let h = parseInt(t[0]);
        let m = parseInt(t[1]);
        let s = parseInt(t[2]);

        if (period === "pm" && h !== 12) {
            h += 12;
        }
        if (period === "am" && h === 12) {
            h = 0;
        }

        return h * 3600 + m * 60 + s;
    }

    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    let startWork = 8 * 3600;      // 8:00 AM
    let endWork = 22 * 3600;       // 10:00 PM

    let idle = 0;

    if (start < startWork) {
        idle += Math.min(end, startWork) - start;
    }

    if (end > endWork) {
        idle += end - Math.max(start, endWork);
    }

    let hours = Math.floor(idle / 3600);
    let minutes = Math.floor((idle % 3600) / 60);
    let seconds = idle % 60;

    minutes = String(minutes).padStart(2, '0');
    seconds = String(seconds).padStart(2, '0');

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {

    function convertToSeconds(time) {
        let t = time.split(":");
        let h = parseInt(t[0]);
        let m = parseInt(t[1]);
        let s = parseInt(t[2]);

        return h * 3600 + m * 60 + s;
    }

    let shift = convertToSeconds(shiftDuration);
    let idle = convertToSeconds(idleTime);

    let active = shift - idle;

    let hours = Math.floor(active / 3600);
    let minutes = Math.floor((active % 3600) / 60);
    let seconds = active % 60;

    minutes = String(minutes).padStart(2, '0');
    seconds = String(seconds).padStart(2, '0');

    return hours + ":" + minutes + ":" + seconds;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {

    function convertToSeconds(time) {
        let t = time.split(":");
        let h = parseInt(t[0]);
        let m = parseInt(t[1]);
        let s = parseInt(t[2]);

        return h * 3600 + m * 60 + s;
    }

    let activeSeconds = convertToSeconds(activeTime);

    let quotaSeconds;

    if (date >= "2025-04-10" && date <= "2025-04-30") {
        quotaSeconds = 6 * 3600; // Eid quota
    } else {
        quotaSeconds = 8 * 3600 + 24 * 60; // normal quota
    }

    return activeSeconds >= quotaSeconds;
}



// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================



function addShiftRecord(textFile, shiftObj) {

    if (!shiftObj || !shiftObj.driverID || !shiftObj.driverName ||
        !shiftObj.date || !shiftObj.startTime || !shiftObj.endTime) {
        return {};
    }

   
    let existingLines = [];
    if (fs.existsSync(textFile)) {
        existingLines = fs.readFileSync(textFile, "utf8").trim().split("\n");
        for (let line of existingLines) {
            const parts = line.split(",");
            const id = parts[0];
            const date = parts[2];
            if (id === shiftObj.driverID && date === shiftObj.date) {
                return {}; // duplicate entry
            }
        }
    }

   
    const shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    const idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const quotaMet = metQuota(shiftObj.date, activeTime);


    const record = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quotaMet,
        hasBonus: false
    };

 
    let newLines = [];
    let inserted = false;
    for (let i = 0; i < existingLines.length; i++) {
        const line = existingLines[i];
        const parts = line.split(",");
        if (!inserted && parts[0] === shiftObj.driverID) {
            // insert after last record of same driver
            let j = i;
            while (j + 1 < existingLines.length && existingLines[j + 1].split(",")[0] === shiftObj.driverID) {
                j++;
            }
            newLines.push(line);
            newLines.push(Object.values(record).join(","));
            i = j;
            inserted = true;
            continue;
        }
        newLines.push(line);
    }

    if (!inserted) {
        newLines.push(Object.values(record).join(","));
    }

    fs.writeFileSync(textFile, newLines.join("\n") + "\n");

    return record;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================



function setBonus(textFile, driverID, date, newValue) {

    if (!fs.existsSync(textFile)) return;

    // read file
    let lines = fs.readFileSync(textFile, "utf8").trim().split("\n");

    let updatedLines = lines.map(line => {

        let parts = line.split(",");

        // assuming driverID = index 0, date = index 2, bonus = index 9
        if (parts[0] === driverID && parts[2] === date) {
            parts[9] = newValue.toString();
        }

        return parts.join(",");
    });

    // rewrite file
    fs.writeFileSync(textFile, updatedLines.join("\n"));
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {

    if (!fs.existsSync(textFile)) return -1;

    let lines = fs.readFileSync(textFile, "utf8").trim().split("\n");

    let count = 0;
    let driverExists = false;

    for (let line of lines) {
        let parts = line.split(",");

        let id = parts[0].trim();
        let date = parts[2].trim();
        let bonus = parts[9].trim();   // FIX: remove spaces

        if (id === driverID) {
            driverExists = true;

            let lineMonth = parseInt(date.split("-")[1]);
            if (lineMonth === parseInt(month) && bonus === "true") {
                count++;
            }
        }
    }

    return driverExists ? count : -1;
}


// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================


function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    if (!fs.existsSync(textFile)) return "0:00:00";

    const lines = fs.readFileSync(textFile, "utf8").trim().split("\n");

    let totalSeconds = 0;
    let driverExists = false;

    for (let line of lines) {
        const parts = line.split(",");

        const id = parts[0].trim();
        const date = parts[2].trim();
        const activeTime = parts[7].trim(); // FIXED COLUMN

        if (id === driverID) {
            driverExists = true;

            const lineMonth = parseInt(date.split("-")[1]);

            if (lineMonth === parseInt(month)) {
                const t = activeTime.split(":").map(Number);
                totalSeconds += t[0] * 3600 + t[1] * 60 + t[2];
            }
        }
    }

    if (!driverExists) return "0:00:00";

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return hours + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(seconds).padStart(2, "0");
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================


function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {

    if (!fs.existsSync(textFile) || !fs.existsSync(rateFile)) return "0:00:00";

    // Read driver rates to find dayOff
    const rateLines = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    let dayOff = null;

    for (let line of rateLines) {
        const parts = line.split(",");
        const id = parts[0];
        if (id === driverID) {
            dayOff = parts[1]; // dayOff is second column
            break;
        }
    }

    if (!dayOff) return "0:00:00";

    // Read shifts
    const shiftLines = fs.readFileSync(textFile, "utf8").trim().split("\n");
    let totalSeconds = 0;

    for (let line of shiftLines) {
        const parts = line.split(",");
        const id = parts[0];
        const date = parts[2];

        if (id !== driverID) continue;

        const shiftMonth = parseInt(date.split("-")[1]);
        if (shiftMonth !== parseInt(month)) continue;

        const dayName = new Date(date).toLocaleString("en-US", { weekday: "long" });
        if (dayName === dayOff) continue; // skip day off

        // Determine daily quota
        let dailySeconds = 8 * 3600 + 24 * 60; // normal day
        if (date >= "2025-04-10" && date <= "2025-04-30") {
            dailySeconds = 6 * 3600; // Eid
        }

        totalSeconds += dailySeconds;
    }

    // Subtract bonus reductions: 2 hours per bonus
    totalSeconds -= bonusCount * 2 * 3600;
    if (totalSeconds < 0) totalSeconds = 0;

    // Convert seconds → hhh:mm:ss
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return hours + ":" + String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {

    const fs = require("fs");
    if (!fs.existsSync(rateFile)) return 0;

    // Read driver rate
    const lines = fs.readFileSync(rateFile, "utf8").trim().split("\n");
    let basePay = 0;
    let tier = 0;

    for (let line of lines) {
        const parts = line.split(",");
        if (parts[0] === driverID) {
            basePay = parseInt(parts[2]);
            tier = parseInt(parts[3]);
            break;
        }
    }

    if (basePay === 0 || tier === 0) return 0;

    // Convert hhh:mm:ss → seconds
    function toSeconds(time) {
        const t = time.split(":").map(Number);
        return t[0] * 3600 + t[1] * 60 + t[2];
    }

    let actualSec = toSeconds(actualHours);
    let requiredSec = toSeconds(requiredHours);

    let missingSec = requiredSec - actualSec;
    if (missingSec <= 0) return basePay;

    // Convert allowed missing hours → seconds
    const allowedHours = [0, 50, 20, 10, 3]; // index = tier
    const allowedSec = allowedHours[tier] * 3600;

    let deductSec = missingSec - allowedSec;
    if (deductSec <= 0) return basePay;

    // Only full hours count
    let deductHours = Math.floor(deductSec / 3600);

    const deductionRate = Math.floor(basePay / 185);
    const salaryDeduction = deductHours * deductionRate;

    return basePay - salaryDeduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
