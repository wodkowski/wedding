// Fragment URL nie jest wysyłany do serwera hostującego stronę.
window.InvitationLinks = {
  read(hash) {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    if (!params.has('zaproszenie')) return null;
    const code = params.get('zaproszenie').replace(/[\s-]/g, '').toUpperCase();
    return /^[2-9A-HJ-NP-Z]{8}$/.test(code) ? code : '';
  }
};
