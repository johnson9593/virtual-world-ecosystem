const EventEmitter = require('events');

class Ecosystem extends EventEmitter {
  constructor(database) {
    super();
    this.db = database;
    this.worldSize = { width: 1000, height: 1000 };
    this.foodGrowthRate = 50; // Food units added per cycle
    this.simulationInterval = null;
  }

  // Initialize world with 25 starting creatures
  async initializeWorld() {
    return new Promise((resolve, reject) => {
      this.db.getAllCreatures((err, creatures) => {
        if (err) {
          reject(err);
          return;
        }

        if (creatures.length === 0) {
          console.log('Initializing world with 25 creatures...');
          const creatureTypes = ['Herbivore', 'Carnivore', 'Omnivore'];
          const creatureNames = [
            'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta',
            'Iota', 'Kappa', 'Lambda', 'Mu', 'Nu', 'Xi', 'Omicron', 'Pi',
            'Rho', 'Sigma', 'Tau', 'Upsilon', 'Phi', 'Chi', 'Psi', 'Omega', 'Apex'
          ];

          let created = 0;
          creatureNames.forEach((name, index) => {
            const type = creatureTypes[index % 3];
            this.db.createCreature(name, type, null, (err) => {
              if (err) console.error('Error creating creature:', err);
              created++;
              if (created === 25) {
                this.updateWorldStats();
                this.db.logEvent('WORLD_INIT', '25 initial creatures spawned', null, () => {});
                console.log('World initialized with 25 creatures');
                resolve();
              }
            });
          });
        } else {
          console.log(`World already has ${creatures.length} creatures`);
          resolve();
        }
      });
    });
  }

  // Start the ecosystem simulation
  startSimulation(intervalMs = 60000) { // Default: 1 minute cycles
    console.log('Starting ecosystem simulation...');
    
    this.simulationInterval = setInterval(() => {
      this.runSimulationCycle();
    }, intervalMs);

    // Run first cycle immediately
    this.runSimulationCycle();
  }

  stopSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      console.log('Ecosystem simulation stopped');
    }
  }

  // Main simulation cycle
  runSimulationCycle() {
    console.log('Running simulation cycle...');
    
    this.db.getAllCreatures((err, creatures) => {
      if (err) {
        console.error('Error getting creatures:', err);
        return;
      }

      this.db.getWorldState((err, worldState) => {
        if (err) {
          console.error('Error getting world state:', err);
          return;
        }

        // Process each creature
        creatures.forEach(creature => {
          this.processCreature(creature, creatures, worldState);
        });

        // Update world state
        this.updateWorldStats();
        
        // Grow food
        this.growFood(worldState);

        // Increment day
        this.db.updateWorldState({ day: worldState.day + 1 }, () => {});
      });
    });
  }

  // Process individual creature behavior
  processCreature(creature, allCreatures, worldState) {
    // Age the creature
    const newAge = creature.age + 1;
    let updates = { age: newAge };

    // Decrease energy
    let energyLoss = 5;
    if (creature.type === 'Carnivore') energyLoss = 7; // Carnivores use more energy
    updates.energy = Math.max(0, creature.energy - energyLoss);

    // Try to eat based on type
    if (creature.type === 'Herbivore') {
      this.herbivoreEat(creature, worldState, updates);
    } else if (creature.type === 'Carnivore') {
      this.carnivoreHunt(creature, allCreatures, updates);
    } else if (creature.type === 'Omnivore') {
      this.omnivoreEat(creature, allCreatures, worldState, updates);
    }

    // Health decreases if energy is low
    if (updates.energy < 20) {
      updates.health = Math.max(0, creature.health - 10);
    } else if (updates.energy > 80) {
      updates.health = Math.min(100, creature.health + 5);
    }

    // Move creature randomly
    updates.x_position = Math.max(0, Math.min(this.worldSize.width, 
      creature.x_position + (Math.random() - 0.5) * 50));
    updates.y_position = Math.max(0, Math.min(this.worldSize.height, 
      creature.y_position + (Math.random() - 0.5) * 50));

    // Check if creature dies
    if (updates.health <= 0 || updates.energy <= 0 || newAge > 100) {
      updates.is_alive = 0;
      updates.died_at = new Date().toISOString();
      
      const reason = updates.health <= 0 ? 'health depletion' : 
                     updates.energy <= 0 ? 'starvation' : 'old age';
      
      this.db.logEvent('DEATH', `${creature.name} died from ${reason}`, creature.id, () => {});
      
      // Notify creator
      if (creature.creator_id) {
        this.db.createNotification(
          creature.creator_id,
          `Your creature ${creature.name} has died from ${reason} at age ${newAge}.`,
          () => {}
        );
      }
    }

    // Reproduction chance if healthy
    if (updates.health > 70 && updates.energy > 70 && newAge > 10 && newAge < 80) {
      if (Math.random() < 0.05) { // 5% chance
        this.reproduceCreature(creature);
      }
    }

    // Update creature in database
    this.db.updateCreature(creature.id, updates, (err) => {
      if (err) console.error('Error updating creature:', err);
    });
  }

  // Herbivore eating behavior
  herbivoreEat(creature, worldState, updates) {
    if (worldState.food_available > 0) {
      const foodEaten = Math.min(30, worldState.food_available);
      updates.energy = Math.min(100, creature.energy + foodEaten);
      
      this.db.updateWorldState({ 
        food_available: worldState.food_available - foodEaten 
      }, () => {});
    }
  }

  // Carnivore hunting behavior
  carnivoreHunt(creature, allCreatures, updates) {
    // Find nearby herbivores
    const prey = allCreatures.filter(c => 
      c.is_alive && 
      c.id !== creature.id && 
      (c.type === 'Herbivore' || (c.type === 'Omnivore' && c.health < 50)) &&
      this.getDistance(creature, c) < 100
    );

    if (prey.length > 0 && Math.random() < 0.3) { // 30% hunt success
      const target = prey[0];
      updates.energy = Math.min(100, creature.energy + 40);
      
      // Kill the prey
      this.db.updateCreature(target.id, { 
        is_alive: 0, 
        health: 0,
        died_at: new Date().toISOString()
      }, () => {});
      
      this.db.logEvent('HUNT', `${creature.name} hunted ${target.name}`, creature.id, () => {});
      
      if (target.creator_id) {
        this.db.createNotification(
          target.creator_id,
          `Your creature ${target.name} was hunted by ${creature.name}.`,
          () => {}
        );
      }
    }
  }

  // Omnivore eating behavior
  omnivoreEat(creature, allCreatures, worldState, updates) {
    // Try to hunt first
    if (Math.random() < 0.5) {
      this.carnivoreHunt(creature, allCreatures, updates);
    } else {
      this.herbivoreEat(creature, worldState, updates);
    }
  }

  // Reproduce creature
  reproduceCreature(creature) {
    const childName = `${creature.name}-Jr-${Date.now().toString().slice(-4)}`;
    
    this.db.createCreature(childName, creature.type, creature.creator_id, (err, childId) => {
      if (!err) {
        this.db.logEvent('BIRTH', `${creature.name} gave birth to ${childName}`, creature.id, () => {});
        
        if (creature.creator_id) {
          this.db.createNotification(
            creature.creator_id,
            `Your creature ${creature.name} has reproduced! New creature: ${childName}`,
            () => {}
          );
        }
      }
    });
  }

  // Grow food in the world
  growFood(worldState) {
    const newFood = Math.min(2000, worldState.food_available + this.foodGrowthRate);
    this.db.updateWorldState({ food_available: newFood }, () => {});
  }

  // Update world statistics
  updateWorldStats() {
    this.db.getAllCreatures((err, creatures) => {
      if (err) return;

      const stats = {
        total_creatures: creatures.length,
        herbivores: creatures.filter(c => c.type === 'Herbivore').length,
        carnivores: creatures.filter(c => c.type === 'Carnivore').length,
        omnivores: creatures.filter(c => c.type === 'Omnivore').length
      };

      this.db.updateWorldState(stats, () => {});
    });
  }

  // Calculate distance between two creatures
  getDistance(creature1, creature2) {
    const dx = creature1.x_position - creature2.x_position;
    const dy = creature1.y_position - creature2.y_position;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Generate daily report for a user
  generateUserReport(userId, callback) {
    this.db.getCreaturesByUser(userId, (err, creatures) => {
      if (err) {
        callback(err, null);
        return;
      }

      this.db.getWorldState((err, worldState) => {
        if (err) {
          callback(err, null);
          return;
        }

        const alive = creatures.filter(c => c.is_alive);
        const dead = creatures.filter(c => !c.is_alive);

        const report = {
          day: worldState.day,
          totalCreatures: creatures.length,
          aliveCreatures: alive.length,
          deadCreatures: dead.length,
          creatures: alive.map(c => ({
            name: c.name,
            type: c.type,
            health: c.health,
            energy: c.energy,
            age: c.age
          })),
          worldStats: {
            totalPopulation: worldState.total_creatures,
            herbivores: worldState.herbivores,
            carnivores: worldState.carnivores,
            omnivores: worldState.omnivores,
            foodAvailable: worldState.food_available
          }
        };

        callback(null, report);
      });
    });
  }
}

module.exports = Ecosystem;