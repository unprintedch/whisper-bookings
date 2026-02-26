/**
 * COUCHE UNIFIÉE D'ACCÈS AUX ENTITÉS BASE44
 * 
 * Point d'entrée unique pour toutes les opérations CRUD.
 * Wrapper autour du SDK Base44 moderne (@/api/base44Client).
 * Centralise la logique et évite les imports d'legacy (@/entities/*).
 * 
 * Usage:
 *   import { Room, Reservation, ... } from '@/components/lib/entitiesWrapper';
 *   const rooms = await Room.list();
 *   const room = await Room.create({...});
 */

import { base44 } from '@/api/base44Client';

/**
 * Proxy wrapper pour une entité
 * Délègue aux méthodes du SDK
 */
class EntityWrapper {
  constructor(entityName) {
    this.entityName = entityName;
  }

  get sdk() {
    return base44.entities[this.entityName];
  }

  async list(sort, limit) {
    if (!this.sdk) throw new Error(`Entity ${this.entityName} not found in SDK`);
    return this.sdk.list(sort, limit);
  }

  async filter(query, sort, limit) {
    if (!this.sdk) throw new Error(`Entity ${this.entityName} not found in SDK`);
    return this.sdk.filter(query, sort, limit);
  }

  async create(data) {
    if (!this.sdk) throw new Error(`Entity ${this.entityName} not found in SDK`);
    return this.sdk.create(data);
  }

  async update(id, data) {
    if (!this.sdk) throw new Error(`Entity ${this.entityName} not found in SDK`);
    return this.sdk.update(id, data);
  }

  async delete(id) {
    if (!this.sdk) throw new Error(`Entity ${this.entityName} not found in SDK`);
    return this.sdk.delete(id);
  }

  async bulkCreate(data) {
    if (!this.sdk) throw new Error(`Entity ${this.entityName} not found in SDK`);
    return this.sdk.bulkCreate(data);
  }

  subscribe(callback) {
    if (!this.sdk) throw new Error(`Entity ${this.entityName} not found in SDK`);
    return this.sdk.subscribe(callback);
  }

  schema() {
    if (!this.sdk) throw new Error(`Entity ${this.entityName} not found in SDK`);
    return this.sdk.schema();
  }

  // Spécial pour User: me() et auth
  async me() {
    if (this.entityName !== 'User') throw new Error('me() is only available for User');
    return base44.auth.me();
  }
}

// Instances pour chaque entité
export const Room = new EntityWrapper('Room');
export const Reservation = new EntityWrapper('Reservation');
export const Group = new EntityWrapper('Group');
export const Site = new EntityWrapper('Site');
export const Agency = new EntityWrapper('Agency');
export const Client = new EntityWrapper('Client');
export const BedConfiguration = new EntityWrapper('BedConfiguration');
export const NotificationSettings = new EntityWrapper('NotificationSettings');
export const Blockout = new EntityWrapper('Blockout');
export const AuditLog = new EntityWrapper('AuditLog');
export const User = new EntityWrapper('User');