// babel-plugin-async-to-promises relies on symbols directly in IE for generator support.
if (typeof Symbol === 'undefined') {
  let c = 0;
  (self.Symbol = function Symbol (x) { return `$$symbol$${x}$${++c}`; }).for = x => `$$symbol$${x}`;
}
