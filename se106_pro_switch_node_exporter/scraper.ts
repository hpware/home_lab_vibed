import { chromium, type Browser, type Page } from "@playwright/test";

export interface PortInfo {
  port: number;
  maxConnectionSpeed: string;
  packetSendSpeed: string;
  connectionStatus: string;
}

export interface SystemInfo {
  ip: string;
  uptimeSeconds: number;
  uptimeRaw: string;
}

export interface SwitchData {
  ports: PortInfo[];
  system: SystemInfo;
  timestamp: number;
}

export class SwitchScraper {
  private browser: Browser | null = null;
  private switchUrl: string;
  private username: string;
  private password: string;

  constructor(
    switchUrl: string | undefined,
    username: string | undefined,
    password: string | undefined,
  ) {
    if (!switchUrl || !username || !password) {
      throw new Error(
        "Missing required environment variables: SWITCH_IP, SWITCH_USER, SWITCH_PASSWORD",
      );
    }
    this.switchUrl = switchUrl;
    this.username = username;
    this.password = password;
  }

  async initialize(): Promise<void> {
    console.log("Initializing browser...");
    this.browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private parseUptime(uptime: string | null): number {
    if (!uptime) return 0;

    const dayMatch = uptime.match(/(\d+)\s*day/);
    const hourMatch = uptime.match(/(\d+)\s*hour/);
    const minMatch = uptime.match(/(\d+)\s*min/);
    const secMatch = uptime.match(/(\d+)\s*sec/);

    const days = dayMatch ? parseInt(dayMatch[1]) : 0;
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minMatch ? parseInt(minMatch[1]) : 0;
    const seconds = secMatch ? parseInt(secMatch[1]) : 0;

    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  }

  async scrape(): Promise<SwitchData> {
    if (!this.browser) {
      throw new Error("Browser not initialized. Call initialize() first.");
    }

    const page = await this.browser.newPage();

    try {
      // Login
      console.log(`Logging into ${this.switchUrl}...`);
      await page.goto(this.switchUrl, { waitUntil: "networkidle" });
      await page.locator("#username").fill(this.username);
      await page.locator("#plain_password").fill(this.password);
      await page.getByRole("button", { name: "登录" }).click();
      await page.waitForTimeout(6000);

      const mainFrame = page.locator('frame[name="mainFrame"]').contentFrame();
      if (!mainFrame) {
        throw new Error("Could not find mainFrame");
      }

      // Scrape port information
      const ports: PortInfo[] = [];
      for (const i of [4, 5, 6, 7, 8, 9]) {
        const portGroup = mainFrame.getByRole("group", { name: "端口信息" });

        const maxConnectionSpeed =
          (await portGroup
            .locator(`tr:nth-child(${i}) > td:nth-child(3)`)
            .textContent()) || "";

        const packetSendSpeed =
          (await portGroup
            .locator(`tr:nth-child(${i}) > td:nth-child(5)`)
            .textContent()) || "";

        const connectionStatus =
          (await portGroup
            .locator(`tr:nth-child(${i}) > td:nth-child(6)`)
            .textContent()) || "";

        ports.push({
          port: i - 3, // Port 1 starts at row 4
          maxConnectionSpeed: maxConnectionSpeed.trim(),
          packetSendSpeed: packetSendSpeed.trim(),
          connectionStatus: connectionStatus.trim(),
        });
      }

      // Scrape system information
      const deviceGroup = mainFrame.getByRole("group", { name: "设备信息" });

      const systemIp =
        (await deviceGroup
          .locator("tr:nth-child(2) > td:nth-child(2)")
          .textContent()) || "";

      const uptimeRaw =
        (await deviceGroup
          .locator("tr:nth-child(2) > td:nth-child(4)")
          .textContent()) || "";

      const uptimeSeconds = this.parseUptime(uptimeRaw);

      console.log(
        `Scraped data: ${ports.length} ports, uptime: ${uptimeSeconds}s`,
      );

      return {
        ports,
        system: {
          ip: systemIp.trim(),
          uptimeSeconds,
          uptimeRaw: uptimeRaw.trim(),
        },
        timestamp: Date.now(),
      };
    } finally {
      await page.close();
    }
  }
}
