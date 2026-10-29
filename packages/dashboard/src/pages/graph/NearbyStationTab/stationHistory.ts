const LOCAL_STORAGE_KEY_STATIONS = "myhome_recent_stations";

export function loadRecentStations(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_STATIONS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to load recent stations", e);
    return [];
  }
}

export function saveRecentStation(station: string): string[] {
  if (!station.trim()) return loadRecentStations();
  try {
    const current = loadRecentStations();
    const filtered = current.filter(
      (x) => x.toLowerCase() !== station.trim().toLowerCase()
    );
    const updated = [station.trim(), ...filtered].slice(0, 10);
    localStorage.setItem(LOCAL_STORAGE_KEY_STATIONS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to save recent station", e);
    return [];
  }
}

export function removeRecentStation(station: string): string[] {
  try {
    const current = loadRecentStations();
    const updated = current.filter(
      (x) => x.toLowerCase() !== station.trim().toLowerCase()
    );
    localStorage.setItem(LOCAL_STORAGE_KEY_STATIONS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error("Failed to remove recent station", e);
    return [];
  }
}

export function clearRecentStations(): void {
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY_STATIONS);
  } catch (e) {
    console.error("Failed to clear recent stations", e);
  }
}
