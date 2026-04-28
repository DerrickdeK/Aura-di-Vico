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
