# Switch Exporter for Prometheus

A Node.js/Bun application that scrapes switch status information using Playwright and exposes it in Prometheus/Node Exporter compatible format. This exporter monitors a Mercury SE106 Pro switch and provides metrics for port status, system uptime, and connection speeds.

## Features

- Scrapes switch data every minute (configurable)
- Exposes metrics in Prometheus format at `/metrics` endpoint
- Monitors port connection status, speeds, and packet rates
- Tracks system uptime
- Docker support for easy deployment
- Automatic retry on scrape failures
- Health check endpoint

## Prerequisites

- Bun runtime (recommended) or Node.js 18+
- Docker and Docker Compose (optional, for containerized deployment)

## Installation

### Local Development

1. Clone this repository and install dependencies:

```bash
bun install
```

2. Install Playwright browsers:

```bash
bun run install-browsers
```

3. Create a `.env` file from the example:

```bash
cp .env.example .env
```

4. Edit `.env` and set your switch credentials:

```env
SWITCH_USER=your_username
SWITCH_PASSWORD=your_password
SWITCH_IP=10.77.1.143
METRICS_PORT=9090
SCRAPE_INTERVAL=60000
```

### Running the Application

#### Local Development

```bash
bun run start
```

Or with auto-reload on changes:

```bash
bun run dev
```

#### Docker Deployment

1. Build and run with Docker Compose:

```bash
docker-compose up -d
```

2. View logs:

```bash
docker-compose logs -f
```

3. Stop the service:

```bash
docker-compose down
```

## Metrics

The exporter provides the following Prometheus metrics:

### Switch Metrics

- `switch_port_connection_status` - Port connection status (1 = connected, 0 = disconnected)
  - Labels: `port`, `status`
- `switch_port_max_speed_mbps` - Port maximum connection speed in Mbps
  - Labels: `port`
- `switch_port_packet_speed_mbps` - Port packet sending speed in Mbps
  - Labels: `port`
- `switch_system_uptime_seconds` - System uptime in seconds
  - Labels: `ip`

### Scraper Metrics

- `switch_scrape_success_total` - Total number of successful scrapes
- `switch_scrape_errors_total` - Total number of failed scrapes
- `switch_last_scrape_timestamp_seconds` - Timestamp of the last successful scrape

### Process Metrics

- Default Node.js process metrics (memory, CPU, etc.) with `switch_exporter_` prefix

## Endpoints

- `GET /metrics` - Prometheus metrics endpoint
- `GET /health` - Health check endpoint
- `GET /` - Status endpoint

## Configuration

All configuration is done via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `SWITCH_USER` | Switch login username | (required) |
| `SWITCH_PASSWORD` | Switch login password | (required) |
| `SWITCH_IP` | Switch IP address | `10.77.1.143` |
| `METRICS_PORT` | Port for metrics server | `9090` |
| `SCRAPE_INTERVAL` | Scrape interval in milliseconds | `60000` (1 minute) |

## Prometheus Configuration

Add this job to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'switch-exporter'
    static_configs:
      - targets: ['localhost:9090']
    scrape_interval: 60s
```

## Architecture

- `index.ts` - Main application entry point
- `scraper.ts` - Playwright-based switch scraper
- `metrics.ts` - Prometheus metrics server
- `Dockerfile` - Docker container definition
- `docker-compose.yml` - Docker Compose configuration

## Troubleshooting

### Browser Launch Fails

If Playwright fails to launch the browser, ensure you've installed the browsers:

```bash
bun run install-browsers
```

In Docker, the Dockerfile automatically installs Chromium and its dependencies.

### Connection Timeouts

If scraping times out, try increasing the `waitForTimeout` value in `scraper.ts` or check network connectivity to the switch.

### Missing Metrics

Check the application logs for scrape errors. The exporter will continue running and retry on the next interval even if individual scrapes fail.

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

