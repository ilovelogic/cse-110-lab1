/* Using good object-oriented design principles, implement a lemonade stand simulation.
You should have a class to represent the state of the lemonade stand. The stand should
maintain an inventory, which is updated every time a cup is sold according to a recipe
that is maintained over time.

The simulation should proceed one day at a time. Each day, the player of the game will
be told what the weather is (more lemonade will be sold on hotter days) and the current
prices for supplies (cups, ice, lemons, and sugar). The player should input how much
supplies to buy at the current prices. Then, the simulation should tell the player how
many cups were sold, how many supplies are left, and what the current cash balance is.

You should do some searching to find out how to handle console input in Node.js. This
is an important skill (beyond just using AI and hoping it uses the API correctly).
Read the documentation and make sure you’re doing it right.

Be sure to commit your code each time you add a feature. We expect to see a few different
commits with appropriate comments as you make progress. Do not just undo and then commit
at the end — we will see you’ve done this when we look at your commit log!
*/


class Day {
    private day: number;
    private weather: string;
    private costs :{ lemonCost: number; sugarCost: number; cupCost: number };
    private WEATHER : string[] = ['snowy', 'rainy', 'cloudy', 'sunny', 'hot'];

    constructor(day: number, weather: string, costOfLemons: number, costOfSugar: number, costOfCups: number) {
        this.day = day;
        this.weather = weather;
        this.costs = {
            lemonCost: costOfLemons,
            sugarCost: costOfSugar,
            cupCost: costOfCups
        };
    }

    getWeather() {
        return this.weather;
    }
    getDay() {
        return this.day;
    }
    getCosts() {
        return this.costs; 
    }

    nextDay() {
        this.day++;
        this.causeRandomWeather();
        this.causeRandomPriceIncrease();
    }

    causeRandomWeather() {
        const randomIndex = Math.floor(Math.random() * this.WEATHER.length);
        const randomWeather = this.WEATHER[randomIndex];
        if (randomWeather === undefined) {
            throw new Error('Weather index out of bounds');
        }
        this.weather = randomWeather;
    }

    causeRandomPriceIncrease() {
        const randomIncrease = Math.floor(Math.random() * 3) + 1; // between $1 and $3
        this.costs.lemonCost += randomIncrease;
        this.costs.sugarCost += randomIncrease;
        this.costs.cupCost += randomIncrease;
    }
}

class LemonadeStand {
    private cashBalance: number;
    private inventory: {lemons: number; sugar: number; cups: number};
    private recipe: {lemonAmount: number, sugarAmount: number, waterAmount: number, iceAmount: number};

    constructor(cashBalance: number, inventory: {lemons: number; sugar: number; cups: number}, recipe: {lemonAmount: number, sugarAmount: number, waterAmount: number, iceAmount: number}) {
        this.cashBalance = cashBalance;
        this.inventory = inventory;
        this.recipe = recipe;
    }

    getInventory() {
        return this.inventory;
    }

    getRecipe() {
        return this.recipe;
        // console.log(`To make a cup of lemonade, you will need: ${this.recipe.lemonAmount} lemons, ${this.recipe.sugarAmount} sugar, and ${this.recipe.waterAmount} water.`);
    }

    getCashBalance() {
        return this.cashBalance;
    }

    // Returns 0 if purchase fails, 1 if successful
    increaseInventory(numberOfCupsIncrease: number, costs: {lemonCost: number, sugarCost: number, cupCost: number}) {
        let charge = numberOfCupsIncrease * (costs.lemonCost * this.recipe.lemonAmount + costs.sugarCost * this.recipe.sugarAmount + costs.cupCost); // ice and water are free
        
        if (this.cashBalance < charge) {
            return 0;
        }

        this.cashBalance -= charge;
        this.inventory.lemons += numberOfCupsIncrease * this.recipe.lemonAmount;
        this.inventory.sugar += numberOfCupsIncrease * this.recipe.sugarAmount;
        this.inventory.cups += numberOfCupsIncrease * 1;
        return 1;
    }

    // If the user's requested amount exceeds available inventory, just make as many as possible
    // Returns the number of cups actually made
    sellLemonade(cupsSold: number) {
        let cupsFromInventoryToMake = this.inventoryToNumberOfLemonadeCups();
        if (cupsSold > cupsFromInventoryToMake) {
            this.sellLemonade(cupsFromInventoryToMake);
            return cupsFromInventoryToMake;
        }

        this.inventory.lemons -= this.recipe.lemonAmount * cupsSold;
        this.inventory.sugar -= this.recipe.sugarAmount * cupsSold;
        this.inventory.cups -= 1 * cupsSold;
        return cupsSold;
    }

    // More rigorous inventory check to support if we wanted separate purchasing logic
    // for each ingredient as an extension in the future
    inventoryToNumberOfLemonadeCups() {
        let cupsWorthOfLemon = this.inventory.lemons / this.recipe.lemonAmount;
        let cupsWorthOfSugar = this.inventory.sugar / this.recipe.sugarAmount;

        return Math.min(this.inventory.cups, Math.min(cupsWorthOfLemon, cupsWorthOfSugar));
    }
}