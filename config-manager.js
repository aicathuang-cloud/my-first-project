const fs = require('fs');
const path = require('path');

class ConfigManager {
  constructor() {
    this._configPath = path.join(__dirname, 'config.json');
    this.config = this.loadConfig();
  }

  get configPath() {
    return this._configPath;
  }

  set configPath(value) {
    this._configPath = value;
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('加载配置文件失败:', error);
    }
    
    // 默认配置
    return {
      autoExecute: true,
      version: '1.0.0'
    };
  }

  saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('保存配置文件失败:', error);
      return false;
    }
  }

  get(key) {
    return this.config[key];
  }

  set(key, value) {
    this.config[key] = value;
    return this.saveConfig();
  }

  isAutoExecuteEnabled() {
    return this.config.autoExecute === true;
  }

  enableAutoExecute() {
    return this.set('autoExecute', true);
  }

  disableAutoExecute() {
    return this.set('autoExecute', false);
  }
}

module.exports = new ConfigManager();