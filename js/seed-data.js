/* ==========================================================================
   Seed Data - Initial Catalog & Demo Queries for Gayatri Computers
   ========================================================================== */

const INITIAL_PRODUCTS = [];
const INITIAL_SERVICE_QUERIES = [];
const INITIAL_PURCHASE_REQUESTS = [];

/* --- Robust LocalStorage Data Storage Engine --- */
class LocalDbStore {
  constructor() {
    this.init();
  }

  init() {
    try {
      if (!localStorage.getItem("gc_products")) {
        localStorage.setItem("gc_products", JSON.stringify(INITIAL_PRODUCTS));
      }
      if (!localStorage.getItem("gc_service_queries")) {
        localStorage.setItem("gc_service_queries", JSON.stringify(INITIAL_SERVICE_QUERIES));
      }
      if (!localStorage.getItem("gc_purchase_requests")) {
        localStorage.setItem("gc_purchase_requests", JSON.stringify(INITIAL_PURCHASE_REQUESTS));
      }
    } catch (e) {
      console.warn("LocalStorage initialization warning:", e);
    }
  }

  async getProducts() {
    try {
      const data = localStorage.getItem("gc_products");
      if (data) return JSON.parse(data);
      return INITIAL_PRODUCTS;
    } catch (e) {
      console.error("Error reading products from localStorage:", e);
      return INITIAL_PRODUCTS;
    }
  }

  async addProduct(product) {
    try {
      const products = await this.getProducts();
      const newProduct = {
        id: "prod-" + Date.now(),
        timestamp: new Date().toISOString(),
        stock: 10,
        rating: 4.8,
        image_url: product.image_url || "assets/hero_banner.jpg",
        ...product
      };
      products.unshift(newProduct);
      localStorage.setItem("gc_products", JSON.stringify(products));
      return newProduct;
    } catch (e) {
      console.error("Error adding product to localStorage:", e);
      throw e;
    }
  }

  async deleteProduct(productId) {
    try {
      let products = await this.getProducts();
      products = products.filter(p => p.id !== productId);
      localStorage.setItem("gc_products", JSON.stringify(products));
      return true;
    } catch (e) {
      console.error("Error deleting product from localStorage:", e);
      return false;
    }
  }

  async getPurchaseRequests() {
    try {
      const data = localStorage.getItem("gc_purchase_requests");
      if (data) return JSON.parse(data);
      return INITIAL_PURCHASE_REQUESTS;
    } catch (e) {
      console.error("Error reading purchase requests from localStorage:", e);
      return INITIAL_PURCHASE_REQUESTS;
    }
  }

  async addPurchaseRequest(requestData) {
    try {
      const requests = await this.getPurchaseRequests();
      const newReq = {
        id: "REQ-" + Math.floor(1000 + Math.random() * 9000),
        status: "Pending",
        timestamp: new Date().toISOString(),
        ...requestData
      };
      requests.unshift(newReq);
      localStorage.setItem("gc_purchase_requests", JSON.stringify(requests));
      return newReq;
    } catch (e) {
      console.error("Error adding purchase request:", e);
      throw e;
    }
  }

  async updatePurchaseRequestStatus(id, newStatus) {
    try {
      const requests = await this.getPurchaseRequests();
      const idx = requests.findIndex(r => r.id === id || r.requestId === id);
      if (idx !== -1) {
        requests[idx].status = newStatus;
        localStorage.setItem("gc_purchase_requests", JSON.stringify(requests));
        return requests[idx];
      }
      return null;
    } catch (e) {
      console.error("Error updating purchase request status:", e);
      return null;
    }
  }

  async deletePurchaseRequest(id) {
    try {
      let requests = await this.getPurchaseRequests();
      requests = requests.filter(r => r.id !== id && r.requestId !== id);
      localStorage.setItem("gc_purchase_requests", JSON.stringify(requests));
      return true;
    } catch (e) {
      console.error("Error deleting purchase request:", e);
      return false;
    }
  }

  async getServiceQueries() {
    try {
      const data = localStorage.getItem("gc_service_queries");
      if (data) return JSON.parse(data);
      return INITIAL_SERVICE_QUERIES;
    } catch (e) {
      console.error("Error reading service queries from localStorage:", e);
      return INITIAL_SERVICE_QUERIES;
    }
  }

  async addServiceQuery(queryData) {
    try {
      const queries = await this.getServiceQueries();
      const queryId = "GC-SRV-" + Math.floor(1000 + Math.random() * 9000);
      const newQuery = {
        id: queryId,
        docket_no: "Pending Assignment",
        status: "Pending Approval",
        admin_notes: "Request received. Waiting for desk verification.",
        timestamp: new Date().toISOString(),
        ...queryData
      };
      queries.unshift(newQuery);
      localStorage.setItem("gc_service_queries", JSON.stringify(queries));
      return newQuery;
    } catch (e) {
      console.error("Error adding service query:", e);
      throw e;
    }
  }

  async searchQueries(term) {
    try {
      const queries = await this.getServiceQueries();
      if (!term) return [];
      const cleanTerm = term.trim().toLowerCase();
      return queries.filter(q => 
        (q.id && q.id.toLowerCase().includes(cleanTerm)) ||
        (q.docket_no && q.docket_no.toLowerCase().includes(cleanTerm)) ||
        (q.phone && q.phone.includes(cleanTerm)) ||
        (q.customer_name && q.customer_name.toLowerCase().includes(cleanTerm))
      );
    } catch (e) {
      console.error("Error searching queries:", e);
      return [];
    }
  }

  async updateServiceQuery(id, updateFields) {
    try {
      const queries = await this.getServiceQueries();
      const idx = queries.findIndex(q => q.id === id);
      if (idx !== -1) {
        queries[idx] = { ...queries[idx], ...updateFields };
        localStorage.setItem("gc_service_queries", JSON.stringify(queries));
        return queries[idx];
      }
      return null;
    } catch (e) {
      console.error("Error updating service query:", e);
      return null;
    }
  }
}

// Global guarantee: Instantiate window.dbStore synchronously
if (typeof window !== "undefined") {
  window.dbStore = new LocalDbStore();
}
