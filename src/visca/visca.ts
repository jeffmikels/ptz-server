// INSPIRED BY https://github.com/benelgiac/PyVisca3/blob/master/pyviscalib/visca.py
// 
// For this JavaScript version, we eliminate all synchronous reads to the socket
// in favor of using callbacks.

import { ViscaController } from './controller';
export let visca = { ViscaController }


/*
typescript help...

// interfaces are only for type checking
// any object that has name:string and toppings:string[] will qualify as a Pizza
interface Pizza {
	name: string,
	toppings: string[]
}

// classes work exactly the same as an interface but can
// create instances and have static methods
// again, objects that support this class interface will satisfy type checks
class Pizza {
	constructor(public name: string, public toppings: string[]) {};
}

// we can call this with a Pizza to get a new pizza with the same data
function PizzaMaker(example: Pizza) {
	// if we went with a class, we do this
	return new Pizza(example.name, example.toppings);

	// if we went with an interface only, we do this
	return {name: example.name, toppings: example.toppings};
}

// we can call the PizzaMaker with a plain object as long as it satisfies the Pizza interface
const pizza = PizzaMaker({ name: 'Inferno', toppings: ['cheese', 'peppers'] });
*/