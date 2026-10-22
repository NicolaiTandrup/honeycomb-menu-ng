# Floorplan sizing — v1.8.0-beta.5

`size: auto` is opt-in for persistent Hub and Control inside Home Assistant
`picture-elements`. It reads the **actual rendered image** in the nearest
picture-elements card, including the image's open `hui-image` shadow root.
The effective size is `82 × rendered image width / intrinsic image width`.
That number enters the existing numeric cube/menu pipeline; there is no second
renderer, CSS scaling layer, dashboard-global setting or image-dimension YAML.

```yaml
type: picture-elements
image: /local/floorplan.png
elements:
  - type: custom:honeycomb-persistent-hub
    size: auto
    logo: auto
    style:
      left: 45%
      top: 55%
    items:
      - type: light
        entity: light.zone_a
        name: Zone A
      - type: sonos
        entity: media_player.player_a
        favorites_sensor: sensor.favorites_a
        name: Player A
  - type: custom:honeycomb-persistent-control
    module: light
    entity: light.zone_b
    size: auto
    style:
      left: 70%
      top: 35%
```

Copy the image into Home Assistant's `www/floorplan.png` yourself, replace the
synthetic entities and enable your official Sonos favorites entity. No custom
Sonos template/cache is supported. Honeycomb does not edit live HA files.

## Fixed mode stays fixed

Use `size: 60`, `size: 82` or another finite positive number for fixed CSS pixels,
inside or outside a floorplan. Omitting `size` still means **fixed 82px**.
There is no new artificial numeric maximum/minimum. Very small cubes remain
mathematically valid but may be unreadable or hard to touch. Auto uses no hidden
minimum, which would break alignment: at 50% image scale cubes are 41px, at 75%
61.5px, at 100% 82px. Prefer an appropriately detailed mobile floorplan or fixed
mode if touch targets become too small. Default ring widths, icon/label spacing and shadows now consume the existing
numeric size variable too, keeping the 82px design proportions at smaller sizes.
Explicit numeric border widths and pixel styles remain explicit pixels.

## Coordinate frame and supported layouts

- Ordinary static `picture-elements` images (including image entities/state-image
  replacements exposing a loaded image) supply intrinsic dimensions. Percentage
  `left` AND `top` map to the actual image pixels, once, including centered or
  two-value CSS `object-position` offsets for `contain` letterbox and `cover`
  cropping. An anchor may fall outside a cropped visible image; choose visible
  coordinates. Honeycomb preserves HA's `translate(-50%,-50%)` anchor transform.
- Standard aspect-preserved image rendering, padding/offsets outside the image
  element, aspect-ratio containers, browser zoom
  are measured from rendered bounds. No viewport-width heuristic is used.
- Nonuniformly stretched `object-fit: fill`, CSS-scaled/rotated/skewed/mirrored/3D frames,
  padded/bordered image elements, multi-part object positions, closed shadow
  roots, CSS-background-only images and live camera/video frames are **not**
  inferred. Missing, loading, hidden or unsupported frames safely use fixed 82px
  without disruptive errors. A later image load/show restores auto sizing.
- Use normal absolute picture-elements percentage positioning. Advanced nested
  wrappers with a different containing block, user `translate` properties,
  extra transforms on an individual overlay, CSS animated transforms without
  resize events and nonpercentage coordinates do not get inferred position
  corrections. Avoid those layouts for auto; fixed numeric size remains available.
- Hubs on the same image share one bounded observer record. Resize/sidebar,
  orientation, image load/source change, view hide/show and reconnect trigger
  coalesced measurements; removal cleans up observers/listeners. No polling.
  HA DOM is not a public sizing API; incompatible future DOM uses the fallback.
- Existing geometry positions the icons/text/artwork, gradients, logo and menus
  from the effective numeric size. Native HA MDI SVG size, default borders, spacing and shadows
  also consume that variable (24px icon at 82px, 12px at 41px), correcting the
  previous inner SVG default that could overflow a small numeric host. The shared wave follows the fill polygon.
  Open nested menus and Back retain their navigation stack and resize together;
  passive resize does not reset idle timeout or call services. The base follows
  its anchor while module centers keep their existing navigation anchor rule.

For an ordinary card with no identifiable floorplan, `size: auto` is harmless
fixed 82px. Each independent card opts in; there is no automatic global YAML
inheritance. `logo: auto` needs no special configuration.

## Owner acceptance

Compare fixed 60/82 and equivalent auto sizes, two+ overlays, 1×/0.75×/0.5×,
portrait/landscape, sidebar, actual source-image replacement, contain/cover,
Light recursive Hue/Kelvin Back and touch targets, Sonos native thumbnails,
logo and synthetic wave. Check hidden views/reload/removal for ghost overlays.
CI uses HA-shaped DOM with real Chromium; final installed HA DOM validation and
small-tablet usability remain owner gates before stable.
