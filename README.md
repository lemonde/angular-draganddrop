# angular-draganddrop
[![Build Status](https://travis-ci.org/lemonde/angular-draganddrop.svg?branch=master)](https://travis-ci.org/lemonde/angular-draganddrop)
[![Dependency Status](https://david-dm.org/lemonde/angular-draganddrop.svg?theme=shields.io)](https://david-dm.org/lemonde/angular-draganddrop)
[![devDependency Status](https://david-dm.org/lemonde/angular-draganddrop/dev-status.svg?theme=shields.io)](https://david-dm.org/lemonde/angular-draganddrop#info=devDependencies)

Drag and drop directives for Angular using native HTML5 API.


## introduction
This module defines 2 directives :
* "draggable" for a draggable element
* "drop" for a drop zone
It handles data type control.

Note HTML5 drag&drop is not trivial. Recommended reads :
* http://www.quirksmode.org/blog/archives/2009/09/the_html5_drag.html
* https://html.spec.whatwg.org/multipage/interaction.html#dnd


## Install

### Using bower

```sh
bower install angular-draganddrop
```

### Using npm

```sh
npm install angular-draganddrop
```

## Usage

HTML :

```html
<!-- Load files. -->
<script src="angular.js"></script>
<script src="angular-draganddrop.js"></script>

<div ng-controller="DragDropCtrl">

  <!-- Draggable element. -->
  <div draggable="true" effect-allowed="copy" draggable-type="custom-object" draggable-data="{foo: 'bar'}"></div>

  <!-- Dropzone element. -->
  <div drop="onDrop($data, $event)" drop-effect="copy" drop-accept="'json/custom-object'" drag-over="onDragOver($event)" drag-over-class="drag-over-accept"></div>

</div>
```

JavaScript :

```js
angular.module('controllers.dragDrop', ['draganddrop'])
.controller('DragDropCtrl', function ($scope) {

  // Drop handler.
  $scope.onDrop = function (data, event) {
    // Get custom object data.
    var customObjectData = data['json/custom-object']; // {foo: 'bar'}

    // Get other attached data.
    var uriList = data['text/uri-list']; // http://mywebsite.com/..

    // ...
  };

  // Drag over handler.
  $scope.onDragOver = function (event) {
    // ...
  };
});
```

### "draggable" directive

Parameters :
- "draggable" Make the element draggable. Accepts a boolean.
- "effect-allowed" Allowed effects for the dragged element, see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#effectAllowed.28.29. Accepts a string.
- "draggable-type" Type of data object attached to the dragged element, this type is prefixed by "json/". Accepts a string.
- "draggable-data" Data attached to the dragged element, data are serialized in JSON. Accepts an Angular expression.
- "dragging-class" Class set during the drag. Accepts a string.
- "drag-start" (optional) an Angular expression to be evaluated on drag start ("dragstart" event).
- "drag-end" (optional) an Angular expression to be evaluated on drag end ("dragend" event).

The draggable directive serializes data as JSON and prefix the specified type with "json/".

### "drop" directive

The drop directive automatically :
- calls the event.preventDefault() for dragenter and dragleave, as asked in the spec
- unserializes data with the "json" format, other data are not formatted
- throttles the dragover event (200ms) to avoid burning your CPU during the drag&drop

Parameters :
- "drop" Drop handler, executed on drop. Accepts an Angular expression.
- "drop-effect" Drop effect to set, see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#dropEffect.28.29. Accepts a string.
- "drop-accept" Types accepted or function to prevent unauthorized drag and drop. Accepts a string, an array, a function or a boolean.
- "drag-over-class" Class set on drag over, when the drag is authorized. Accepts a string.
- "drag-over" (optional) an Angular expression to be evaluated on drag over ("dragover" event).
- "drag-enter" (optional) an Angular expression to be evaluated on drag enter ("dragenter" event).
- "drag-leave" (optional) an Angular expression to be evaluated on drag leave ("dragleave" event).
- "drop" (optional) an Angular expression to be evaluated on drag over ("drop" event).

Handlers are : `(scope, { $data: data, $event: event })`


## Browsers support

[All navigators that support the native HTML5 API](http://caniuse.com/dragndrop) should be supported.

Tested on Firefox 24+, Chrome 31+.

## License

MIT
