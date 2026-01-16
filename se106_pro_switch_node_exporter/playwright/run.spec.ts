// Switch: Mercury SE106 Pro
import { test } from "@playwright/test";

const swIP = "http://10.18.18.251/"; // default static IP for device.
const swUser = "";
const swPassword = "";

test("Get System Status", async ({ page }) => {
  // login!
  await page.goto(swIP);
  await page.locator("#username").fill(swUser);
  await page.locator("#plain_password").fill(swPassword);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(6000);

  // Switch Port Status
  [4, 5, 6, 7, 8, 9].forEach(async (i: number) => {
    const portMaxConnectionSpeed = await page
      .locator('frame[name="mainFrame"]')
      .contentFrame()
      .getByRole("group", { name: "端口信息" })
      .locator(`tr:nth-child(${i}) > td:nth-child(3)`)
      .textContent();
    const portPacketSendinSpeed /*Mbps */ = await page
      .locator('frame[name="mainFrame"]')
      .contentFrame()
      .getByRole("group", { name: "端口信息" })
      .locator(`tr:nth-child(${i}) > td:nth-child(5)`)
      .textContent();
    const connectionStatus = await page
      .locator('frame[name="mainFrame"]')
      .contentFrame()
      .getByRole("group", { name: "端口信息" })
      .locator(`tr:nth-child(${i}) > td:nth-child(6)`)
      .textContent();
    if (portMaxConnectionSpeed === "断开") {
      console.log("Disconnected");
    }
  });

  // system IP
  console.log(
    await page
      .locator('frame[name="mainFrame"]')
      .contentFrame()
      .getByRole("group", { name: "设备信息" })
      .locator("tr:nth-child(2) > td:nth-child(2)")
      .textContent(),
  );

  // system uptime
  const uptime = await page
    .locator('frame[name="mainFrame"]')
    .contentFrame()
    .getByRole("group", { name: "设备信息" })
    .locator("tr:nth-child(2) > td:nth-child(4)")
    .textContent();
  console.log(uptime);
  const parseUptime = () => {
    if (uptime === null) return;
    const dayMatch = uptime.match(/(\d+)\s*day/);
    const hourMatch = uptime.match(/(\d+)\s*hour/);
    const minMatch = uptime.match(/(\d+)\s*min/);
    const secMatch = uptime.match(/(\d+)\s*sec/);

    const days = dayMatch ? parseInt(dayMatch[1]) : 0;
    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minMatch ? parseInt(minMatch[1]) : 0;
    const seconds = secMatch ? parseInt(secMatch[1]) : 0;
    return days * 86400 + hours * 3600 + minutes * 60 + seconds;
  };
  console.log(parseUptime());
});
