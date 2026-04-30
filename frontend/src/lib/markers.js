import L from "leaflet";

// Fix leaflet default icon path (we use custom DivIcons anyway, but be safe).
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export function poiIcon(state) {
  // state: 'undiscovered' | 'inrange' | 'visited'
  return L.divIcon({
    className: "brera-marker",
    html: `<div class="brera-marker-pin brera-marker-${state}"><span>★</span></div>`,
    iconSize: [34, 42],
    iconAnchor: [17, 38],
    popupAnchor: [0, -36],
  });
}

export function userIcon() {
  return L.divIcon({
    className: "brera-user-dot",
    html: `<div class="brera-user-dot-inner"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// Anonymous "aura" dot used on the public landing map.
// Three concentric rings ripple outward to evoke the city's pulse.
export function auraIcon(seed = 0) {
  return L.divIcon({
    className: "aura-marker",
    html: `<div class="aura-dot" style="animation-delay:${(seed % 5) * 0.4}s">
        <span class="aura-ring"></span>
        <span class="aura-ring aura-ring-2"></span>
        <span class="aura-ring aura-ring-3"></span>
      </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// A named, well-known landmark (Pinacoteca, La Scala…). Visually distinct
// from the anonymous aura dots — has a numbered terracotta pin so visitors
// can match it to its thumbnail card.
export function landmarkIcon(number, active = false) {
  return L.divIcon({
    className: "landmark-marker",
    html: `<div class="landmark-pin${active ? " landmark-pin-active" : ""}">
        <span>${number}</span>
      </div>`,
    iconSize: [32, 38],
    iconAnchor: [16, 36],
  });
}
