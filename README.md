# Time-based Color Pixel (Cloudflare Worker)

A Cloudflare Worker that returns a 1x1 PNG pixel. By Elvis Mao

The color depends on whether the current time (Asia/Taipei) is within a given time range.

## Usage

```

/?s=12:00&e=13:00&d=D4D4D4&c=FF9000

```

### Query Parameters

| Param | Description                       |
| ----- | --------------------------------- |
| s     | Start time (HH:MM, 24-hour)       |
| e     | End time (HH:MM, 24-hour)         |
| d     | Default color (6-digit hex, no #) |
| c     | Current color (6-digit hex, no #) |

### Behavior

- If current time is within `[s, e)` → returns color `c`
- Otherwise → returns color `d`
- Supports cross-midnight ranges (e.g., 23:00–01:00)
- Timezone: Asia/Taipei

## Example

```

/?s=23:00&e=01:00&d=111111&c=00FF99

```

## Development

Install dependencies:

```bash
pnpm install
```

Run tests:

```bash
pnpm test
```

Deploy:

```bash
wrangler deploy
```

## Notes

- Response: `image/png`
- Cache-Control: `no-store` by default
