import "dotenv/config";
import { SwitchScraper } from "./scraper.ts";
import { MetricsServer } from "./metrics.ts";

const SWITCH_IP = process.env.SWITCH_IP;
const SWITCH_USER = process.env.SWITCH_USER;
const SWITCH_PASSWORD = process.env.SWITCH_PASSWORD;
const METRICS_PORT = parseInt(process.env.METRICS_PORT || "9090");
const SCRAPE_INTERVAL = parseInt(process.env.SCRAPE_INTERVAL || "60000");

async function main() {
  console.log("Starting Switch Exporter...");
  console.log(`Switch IP: ${SWITCH_IP}`);
  console.log(`Metrics Port: ${METRICS_PORT}`);
  console.log(`Scrape Interval: ${SCRAPE_INTERVAL}ms`);

  // Validate environment variables
  if (!SWITCH_IP || !SWITCH_USER || !SWITCH_PASSWORD) {
    console.error(
      "Error: Missing required environment variables (SWITCH_IP, SWITCH_USER, SWITCH_PASSWORD)",
    );
    console.error(
      "Please create a .env file based on .env.example and fill in your credentials",
    );
    process.exit(1);
  }

  // Initialize scraper
  const scraper = new SwitchScraper(
    `http://${SWITCH_IP}`,
    SWITCH_USER,
    SWITCH_PASSWORD,
  );

  await scraper.initialize();

  // Initialize metrics server
  const metricsServer = new MetricsServer(METRICS_PORT);
  await metricsServer.start();

  // Perform initial scrape
  console.log("Performing initial scrape...");
  try {
    const data = await scraper.scrape();
    metricsServer.updateMetrics(data);
    console.log("Initial scrape completed successfully");
  } catch (error) {
    console.error("Initial scrape failed:", error);
    metricsServer.recordError();
  }

  // Set up periodic scraping
  const intervalId = setInterval(async () => {
    console.log(`\nScraping data at ${new Date().toISOString()}...`);
    try {
      const data = await scraper.scrape();
      metricsServer.updateMetrics(data);
    } catch (error) {
      console.error("Scrape failed:", error);
      metricsServer.recordError();
    }
  }, SCRAPE_INTERVAL);

  // Graceful shutdown
  const shutdown = async () => {
    console.log("\nShutting down...");
    clearInterval(intervalId);
    await scraper.close();
    await metricsServer.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("\nSwitch Exporter is running. Press Ctrl+C to stop.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});