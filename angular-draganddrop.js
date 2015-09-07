angular
.module('draganddrop', [])
.directive('draggable', ['$parse', draggableDirective])
.directive('drop', ['$parse', dropDirective]);


// log hooks for developers
// @see https://github.com/lemonde/angular-draganddrop/wiki#possible-implementations-of-debug-hooks-
function debugDraggable(scope) {}
function debugDroppable(scope) {}


/**
 * Draggable directive.
 *
 * @example
 * <div draggable="true" effect-allowed="link" draggable-type="image" draggable-data="{foo: 'bar'}"></div>
 *
 * - "draggable" Make the element draggable. Accepts a boolean.
 * - "effect-allowed" Allowed effects for the dragged element,
     see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#effectAllowed.28.29.
     Accepts a string.
 * - "draggable-type" Type of data object attached to the dragged element, this type
     is prefixed by "json/". Accepts a string.
 * - "draggable-data" Data attached to the dragged element, data are serialized in JSON.
     Accepts an Angular expression.
 * - "dragging-class"
 * - "drag-start"
 * - "drag-end"
 */

function draggableDirective($parse) {
  'use strict';

  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      debugDraggable(scope, 'init');

      var domElement = element[0];
      var effectAllowed;
      var draggableData;
      var draggableType;
      var draggingClass = attrs.draggingClass;

      attrs.$observe('effectAllowed', function (val) {
        debugDraggable(scope, 'observed effectAllowed change');
        effectAllowed = val;
      });

      attrs.$observe('draggableData', function (val) {
        debugDraggable(scope, 'observed draggableData change');
        draggableData = val;
      });

      attrs.$observe('draggableType', function (val) {
        debugDraggable(scope, 'observed draggableType change');
        draggableType = val;
      });

      attrs.$observe('draggable', function (draggable) {
        debugDraggable(scope, 'observed draggable change');
        domElement.draggable = (draggable !== 'false');
      });

      var dragStartHandler = $parse(attrs.dragStart);
      var dragEndHandler = $parse(attrs.dragEnd);

      var rawDragStartHandler = $parse(attrs.dragStartRaw);
      var rawDragEndHandler = $parse(attrs.dragEndRaw);

      domElement.addEventListener('dragstart', dragStartListener);
      domElement.addEventListener('dragend', dragEndListener);

      scope.$on('$destroy', function () {
        debugDraggable(scope, '$destroy');
        domElement.removeEventListener('dragstart', dragStartListener);
        domElement.removeEventListener('dragend', dragEndListener);
      });

      // Convenience function to help the directive user.
      // AngularJS default error is unclear.
      function safeDraggableDataEval() {
        try {
          return scope.$eval(draggableData);
        }
        catch(e) {
          // throw a clearer error
          throw new Error('draggable-data can\'t be parsed by Angular : ' +
              'check your draggable directive invocation !');
        }
      }

      function dragStartListener(event) {
        debugDraggable(scope, 'dragstart');

        // Restrict drag effect.
        event.dataTransfer.effectAllowed = effectAllowed || event.dataTransfer.effectAllowed;

        if (draggingClass) element.addClass(draggingClass);

        // Eval and serialize data.
        var data = safeDraggableDataEval();
        var jsonData = angular.toJson(data);

        // Set drag data and drag type.
        event.dataTransfer.setData('json/' + draggableType, jsonData);

        // Call custom handlers
        if (attrs.dragStartRaw) {
          rawDragStartHandler(scope, { $data: data, $event: event });
        }
        if (attrs.dragStart) {
          scope.$apply(function () {
            dragStartHandler(scope, { $data: data, $event: event });
          });
        }

        event.stopPropagation();
      }

      function dragEndListener(event) {
        debugDraggable(scope, 'dragend');

        element.removeClass(draggingClass);

        // Eval and serialize data.
        var data = safeDraggableDataEval();

        // Call custom handlers
        if (attrs.dragEndRaw) {
          rawDragEndHandler(scope, { $data: data, $event: event });
        }
        if (attrs.dragEnd) {
          scope.$apply(function () {
            dragEndHandler(scope, { $data: data, $event: event });
          });
        }

        event.stopPropagation();
      }
    }
  };
}

/**
 * Drop directive.
 *
 * @example
 * <div drop="onDrop($data, $event)" drop-effect="link" drop-accept="'json/image'"
 * drag-over="onDragOver($event)" drag-over-class="drag-over"></div>
 *
 * - "drop" Drop handler, executed on drop. Accepts an Angular expression.
 * - "drop-effect" Drop effect to set,
     see https://developer.mozilla.org/en-US/docs/Web/API/DataTransfer#dropEffect.28.29.
     Accepts a string.
 * - "drop-accept" Types accepted or function to prevent unauthorized drag and drop.
 *   Accepts a string, an array, a function or a boolean.
 * - "drag-over" Drag over handler, executed on drag over. Accepts an Angular expression.
 * - "drag-over-class" Class set on drag over, when the drag is authorized. Accepts a string.
 */

function dropDirective($parse) {
  'use strict';

  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      debugDroppable(scope, 'init');

      var domElement = element[0];
      var dropEffect = attrs.dropEffect;
      var dropAccept = attrs.dropAccept;
      var dragOverClass = attrs.dragOverClass;

      var dragOverHandler = $parse(attrs.dragOver);
      var dragEnterHandler = $parse(attrs.dragEnter);
      var dragLeaveHandler = $parse(attrs.dragLeave);
      var dropHandler = $parse(attrs.drop);

      var rawDragOverHandler = $parse(attrs.dragOverRaw);
      var rawDragEnterHandler = $parse(attrs.dragEnterRaw);
      var rawDragLeaveHandler = $parse(attrs.dragLeaveRaw);
      var rawDropHandler = $parse(attrs.dropRaw);

      domElement.addEventListener('dragover', dragOverListener);
      domElement.addEventListener('dragenter', dragEnterListener);
      domElement.addEventListener('dragleave', dragLeaveListener);
      domElement.addEventListener('drop', dropListener);

      scope.$on('$destroy', function () {
        domElement.removeEventListener('dragover', dragOverListener);
        domElement.removeEventListener('dragenter', dragEnterListener);
        domElement.removeEventListener('dragleave', dragLeaveListener);
        domElement.removeEventListener('drop', dropListener);
      });

      var throttledDragover = 0;

      function dragOverListener(event) {
        debugDroppable(scope, 'dragover');

        // Check if type is accepted.
        if (! accepts(scope.$eval(dropAccept), event)) {
          debugDroppable(scope, 'dragover rejected, draggable type not accepted');
          return true;
        }

        // Prevent default to accept drag and drop.
        event.preventDefault();

        // Set up drop effect to link.
        event.dataTransfer.dropEffect = dropEffect || event.dataTransfer.dropEffect;

        if (dragOverClass) element.addClass(dragOverClass);

        // throttling to avoid loading CPU
        var now = new Date().getTime();
        if (now - throttledDragover < 200) {
          debugDroppable(scope, 'dragover throttled');
          return;
        }
        throttledDragover = now;

        // Call custom handlers
        var data = getData(event);
        if (attrs.dragOverRaw) {
          debugDroppable(scope, 'raw dragover callback !');
          rawDragOverHandler(scope, { $data: data, $event: event });
        }
        if (attrs.dragOver) {
          scope.$apply(function () {
            debugDroppable(scope, 'dragover callback !');
            dragOverHandler(scope, { $data: data, $event: event });
          });
        }
      }

      function dragEnterListener(event) {
        debugDroppable(scope, 'dragenter');

        // Check if type is accepted.
        if (! accepts(scope.$eval(dropAccept), event)) return true;

        // Prevent default to accept drag and drop.
        event.preventDefault();

        if (dragOverClass) element.addClass(dragOverClass);

        // Call custom handlers
        var data = getData(event);
        if (attrs.dragEnterRaw) {
          debugDroppable(scope, 'raw dragenter callback !');
          rawDragEnterHandler(scope, { $data: data, $event: event });
        }
        if (attrs.dragEnter) {
          scope.$apply(function () {
            debugDroppable(scope, 'dragenter callback !');
            dragEnterHandler(scope, { $data: data, $event: event });
          });
        }
      }

      function dragLeaveListener(event) {
        debugDroppable(scope, 'dragleave');

        // Check if type is accepted.
        if (! accepts(scope.$eval(dropAccept), event)) return true;

        // Prevent default to accept drag and drop.
        event.preventDefault();

        element.removeClass(dragOverClass);

        // Call custom handlers
        var data = getData(event);
        if (attrs.dragLeaveRaw) {
          debugDroppable(scope, 'raw dragleave callback !');
          rawDragLeaveHandler(scope, { $data: data, $event: event });
        }
        if (attrs.dragLeave) {
          scope.$apply(function () {
            debugDroppable(scope, 'dragleave callback !');
            dragLeaveHandler(scope, { $data: data, $event: event });
          });
        }
      }

      function dropListener(event) {
        debugDroppable(scope, 'drop');

        // Prevent default navigator behaviour.
        event.preventDefault();

        element.removeClass(dragOverClass);

        // Call custom handlers
        var data = getData(event);
        if (attrs.dropRaw) {
          debugDroppable(scope, 'raw drop callback !');
          rawDropHandler(scope, { $data: data, $event: event });
        }
        if (attrs.drop) {
          scope.$apply(function () {
            debugDroppable(scope, 'drop callback !');
            dropHandler(scope, { $data: data, $event: event });
          });
        }
      }

      /**
       * Test if a type is accepted.
       *
       * @param {String|Array|Function} type
       * @param {Event} event
       * @returns {Boolean}
       */

      function accepts(type, event) {
        if (typeof type === 'boolean') return type;
        if (typeof type === 'string') return accepts([type], event);
        if (Array.isArray(type)) {
          return accepts(function (eventTypes) {
            return eventTypes.some(function (eventType) {
              eventType = eventType.split('/');
              return type.some(function (_type) {
                _type = _type.split('/');

                var match = true;
                eventType.forEach(function (eventTypeChunk, index) {
                  if (_type[index] === '*') return;
                  if (eventTypeChunk !== _type[index]) match = false;
                });

                return match;
              });
            });
          }, event);
        }
        if (typeof type === 'function') return type(toArray(event.dataTransfer.types));

        return false;
      }

      /**
       * Get data from a drag event.
       *
       * @param {Event} event
       * @returns {Object}
       */

      function getData(event) {
        var types = toArray(event.dataTransfer.types);

        return types.reduce(function (collection, type) {
          // Get data.
          var data = event.dataTransfer.getData(type);

          // Get data format.
          var format = type.split('/')[0];

          // Parse data.
          if (format === 'json' && data) data = angular.fromJson(data);

          collection[type] = data;

          type.split('/').reduce(function (accumulator, chunk) {
            accumulator.push(chunk);
            collection[accumulator.join('/')] = data;
            return accumulator;
          }, []);

          return collection;
        }, {});
      }

      /**
       * Convert a collection to an array.
       *
       * @param {Object} collection
       */

      function toArray(collection) {
        return Array.prototype.slice.call(collection);
      }
    }
  };
}
