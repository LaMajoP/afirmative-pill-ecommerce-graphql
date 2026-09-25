const { createLoaders } = require('./dataloaders');

/**
 * Se invoca en CADA petición HTTP. Es la clave del "caching por request"
 * del patrón DataLoader: un usuario nunca ve datos cacheados de otro,
 * y la caché se descarta automáticamente al terminar el request.
 */
function buildContext() {
  return {
    loaders: createLoaders(),
  };
}

module.exports = { buildContext };
