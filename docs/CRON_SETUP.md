# MSTR Options Fetcher - Daily Cron Setup

## 🕐 **Schedule: Daily at 7 AM EST**

The MSTR options fetcher should run once daily before market open to capture fresh options data.

## 📅 **Cron Expression**

```bash
# 7 AM EST = 12 PM UTC (EST is UTC-5)
0 12 * * *
```

## 🚀 **Setup Commands**

### **1. Open crontab editor:**
```bash
crontab -e
```

### **2. Add this line:**
```bash
# MSTR Options Fetcher - Daily at 7 AM EST
0 12 * * * cd /Users/devaangmandalia/Code/direction\ sky/direction-sky && /usr/bin/node polygon-fetcher-mstr-only.js >> mstr-fetcher.log 2>&1
```

### **3. Save and exit:**
- Press `Ctrl+X` (or `Cmd+X` on Mac)
- Press `Y` to confirm
- Press `Enter` to save

## 🔍 **Verify Setup**

### **View current cron jobs:**
```bash
crontab -l
```

### **Check if job was added:**
```bash
crontab -l | grep "polygon-fetcher-mstr-only.js"
```

## 📊 **Monitoring**

### **View logs:**
```bash
tail -f mstr-fetcher.log
```

### **View recent logs:**
```bash
tail -20 mstr-fetcher.log
```

### **Manual test run:**
```bash
node polygon-fetcher-mstr-only.js
```

## 🗑️ **Remove Cron Job**

### **Remove the specific job:**
```bash
crontab -l | grep -v 'polygon-fetcher-mstr-only.js' | crontab -
```

### **Remove all cron jobs:**
```bash
crontab -r
```

## ⚠️ **Important Notes**

1. **Timezone**: The cron job runs in UTC, so 7 AM EST = 12 PM UTC
2. **Path**: Make sure the path to your script is correct
3. **Logs**: All output will be saved to `mstr-fetcher.log`
4. **Market Hours**: 7 AM EST is before market open (9:30 AM EST)
5. **API Limits**: Running once daily respects Polygon.io API rate limits

## 🎯 **Expected Behavior**

- **Daily at 7 AM EST**: Fetcher runs automatically
- **Logs**: All output saved to `mstr-fetcher.log`
- **Data**: Fresh MSTR options data stored in BigQuery
- **Duration**: ~2 minutes to fetch ~5,600+ options
- **Reliability**: Automatic retries and error handling

## 🔧 **Troubleshooting**

### **If cron job doesn't run:**
1. Check if cron service is running: `sudo service cron status`
2. Verify the path is correct
3. Check the log file for errors
4. Test manual execution first

### **If you get permission errors:**
1. Make sure the script is executable: `chmod +x polygon-fetcher-mstr-only.js`
2. Check file permissions and ownership
3. Verify the working directory path 