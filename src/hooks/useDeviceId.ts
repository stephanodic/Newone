export function getDeviceId(): string {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = 'device_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('device_id', id);
  }
  return id;
}
