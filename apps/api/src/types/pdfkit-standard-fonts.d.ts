// pdfkit exposes its standard-font metrics as public subpaths (see the "exports" map in
// pdfkit/package.json) but ships no types for them. We import them purely for their
// side effect -- see policy-pdf.ts -- so an opaque declaration is all that is needed.
declare module 'pdfkit/standard-fonts/*'
