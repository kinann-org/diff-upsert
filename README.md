# diff-upsert
JSON diff for upserting

### Overview
`DiffUpsert` lets you diff a modified JSON object with a base object. The resulting delta can then by used
to update the base object. This is helpful for managing changes JSON configurations.

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
//    color: 'red',
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

