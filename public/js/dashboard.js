document.addEventListener('DOMContentLoaded', function() {
  // Mobile sidebar toggle
  const menuBtn = document.getElementById('mobileMenuBtn');
  const mobileSidebar = document.getElementById('mobileSidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  if (menuBtn && mobileSidebar) {
    menuBtn.addEventListener('click', () => {
      mobileSidebar.classList.toggle('hidden');
    });

    if (sidebarOverlay) {
      sidebarOverlay.addEventListener('click', () => {
        mobileSidebar.classList.add('hidden');
      });
    }
  }
});
