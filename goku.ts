const x = {
  name: 'Goku',
  age: 18,
};

let y: undefined = undefined;
let z: number = null;
type Slim = Omit<{ id:number; pwd:string; token:string }, 'pwd'>

type Reardonly<T> = {
  readonly [K in keyof T]: T[K];
};
type ReadonlyGoku = Reardonly<Goku>;

overload function overloads
function overloads(x: ReadonlyGoku): void;
function overloads(x: Goku): void;
function overloads(x: Goku | ReadonlyGoku): void 