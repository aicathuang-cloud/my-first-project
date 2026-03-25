class OpenClawProgressBar {
  constructor(options = {}) {
    this.total = options.total || 100;
    this.current = 0;
    this.width = options.width || 50;
    this.fill = options.fill || '█';
    this.empty = options.empty || ' ';
    this.prefix = options.prefix || 'Progress: ';
    this.suffix = options.suffix || '';
  }

  update(progress) {
    this.current = Math.min(progress, this.total);
    this.render();
  }

  increment(amount = 1) {
    this.update(this.current + amount);
  }

  render() {
    const percentage = Math.round((this.current / this.total) * 100);
    const filledLength = Math.round((this.width * this.current) / this.total);
    const emptyLength = this.width - filledLength;
    
    const bar = this.fill.repeat(filledLength) + this.empty.repeat(emptyLength);
    const output = `${this.prefix}[${bar}] ${percentage}% ${this.suffix}`;
    
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(output);
  }

  done() {
    this.update(this.total);
    process.stdout.write('\n');
  }
}

module.exports = OpenClawProgressBar;