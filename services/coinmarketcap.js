const axios = require('axios');

/**
 * Servicio para obtener precios de criptomonedas desde CoinMarketCap API
 * 
 * Requiere: COINMARKETCAP_API_KEY en las variables de entorno
 * 
 * Documentación: https://coinmarketcap.com/api/documentation/v1/
 */
class CoinMarketCapService {
  constructor() {
    this.apiKey = process.env.COINMARKETCAP_API_KEY;
    this.baseUrl = 'https://pro-api.coinmarketcap.com/v1';
    this.cryptocurrencyMap = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'XRP': 'ripple',
      'SOL': 'solana',
      'BNB': 'binancecoin',
      'ADA': 'cardano',
      // RWA y DEPIN no están en CoinMarketCap, se mantendrán con valores estáticos
    };
  }

  /**
   * Obtiene el precio actual y cambio 24h de una criptomoneda
   * @param {string} symbol - Símbolo de la criptomoneda (BTC, ETH, etc.)
   * @returns {Promise<{priceEur: number, change24h: number}>}
   */
  async getPrice(symbol) {
    if (!this.apiKey) {
      throw new Error('COINMARKETCAP_API_KEY no está configurada en las variables de entorno');
    }

    const coinId = this.cryptocurrencyMap[symbol.toUpperCase()];
    if (!coinId) {
      throw new Error(`Moneda ${symbol} no está mapeada para CoinMarketCap`);
    }

    try {
      const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        params: {
          symbol: symbol.toUpperCase(),
          convert: 'EUR'
        },
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json'
        }
      });

      const data = response.data.data[symbol.toUpperCase()];
      if (!data) {
        throw new Error(`No se encontraron datos para ${symbol}`);
      }

      const quote = data.quote.EUR;
      const priceEur = quote.price;
      const change24h = quote.percent_change_24h || 0;

      return {
        priceEur: parseFloat(priceEur.toFixed(2)),
        change24h: parseFloat(change24h.toFixed(2))
      };
    } catch (error) {
      if (error.response) {
        console.error('Error de CoinMarketCap API:', error.response.status, error.response.data);
        throw new Error(`Error de API: ${error.response.data.status?.error_message || 'Error desconocido'}`);
      }
      throw error;
    }
  }

  /**
   * Obtiene precios de múltiples criptomonedas a la vez
   * @param {string[]} symbols - Array de símbolos
   * @returns {Promise<Map<string, {priceEur: number, change24h: number}>>}
   */
  async getMultiplePrices(symbols) {
    if (!this.apiKey) {
      throw new Error('COINMARKETCAP_API_KEY no está configurada en las variables de entorno');
    }

    // Filtrar solo las monedas que están en CoinMarketCap
    const validSymbols = symbols
      .map(s => s.toUpperCase())
      .filter(s => this.cryptocurrencyMap[s]);

    if (validSymbols.length === 0) {
      return new Map();
    }

    try {
      const response = await axios.get(`${this.baseUrl}/cryptocurrency/quotes/latest`, {
        params: {
          symbol: validSymbols.join(','),
          convert: 'EUR'
        },
        headers: {
          'X-CMC_PRO_API_KEY': this.apiKey,
          'Accept': 'application/json'
        }
      });

      const results = new Map();
      const data = response.data.data;

      for (const symbol of validSymbols) {
        if (data[symbol]) {
          const quote = data[symbol].quote.EUR;
          results.set(symbol, {
            priceEur: parseFloat(quote.price.toFixed(2)),
            change24h: parseFloat((quote.percent_change_24h || 0).toFixed(2))
          });
        }
      }

      return results;
    } catch (error) {
      if (error.response) {
        console.error('Error de CoinMarketCap API:', error.response.status, error.response.data);
        throw new Error(`Error de API: ${error.response.data.status?.error_message || 'Error desconocido'}`);
      }
      throw error;
    }
  }

  /**
   * Verifica si una moneda está disponible en CoinMarketCap
   * @param {string} symbol - Símbolo de la criptomoneda
   * @returns {boolean}
   */
  isAvailable(symbol) {
    return !!this.cryptocurrencyMap[symbol.toUpperCase()];
  }
}

module.exports = CoinMarketCapService;
