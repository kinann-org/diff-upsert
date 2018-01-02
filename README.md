# diff-upsert
`DiffUpsert` deep diffs a modified JSON object with a base object using recursive matcher. 
`DiffUpsert` can also upsert a delta into a base object to bring it up-to-date.
This is helpful for managing changes to JSON configurations with deep trees.

NOTE: Contrast this behavior with the standard `Object.assign()` method, which only handles shallow deltas.

#### Base Object
```
var jbase = {
    color: 'red',
    sleeve: {
        length: 31,
    },
}
```

#### Updated Object
```
var jupdated = {
    color: 'red',
    sleeve: {
        length: 32, // updated property
    },
}
```

#### diff
```
var du = new DiffUpsert();
var delta = du.diff(jupdated, jbase);
//{
//    sleeve: {
//        length: 32, // updated property
//    },
//}
```

#### upsert
```
// jbase.sleeve.length === 31
du.upsert(jbase, delta); 
// jbase.sleeve.length === 32
```

