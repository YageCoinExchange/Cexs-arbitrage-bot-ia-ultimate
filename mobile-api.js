// Versión simplificada sin dependencias
class MobileAPI {
  constructor(config) {
    this.enabled = false;
    console.log('📱 Mobile API disabled (firebase-admin no instalado)');
  }
  
  start() {
    // No hacer nada
    return;
  }
  
  stop() {
    // No hacer nada
    return;
  }
  
  sendNotification() {
    // No hacer nada
    return;
  }
}

module.exports = MobileAPI;