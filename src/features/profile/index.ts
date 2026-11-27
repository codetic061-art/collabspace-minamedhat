export async function loadProfilePage() {
  const { ProfilePage } = await import('./ProfilePage');
  return { Component: ProfilePage };
}

export async function loadProfileSettingsPage() {
  const { ProfileSettingsPage } = await import('./ProfileSettingsPage');
  return { Component: ProfileSettingsPage };
}
