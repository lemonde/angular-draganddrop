/*! Angular draganddrop v0.2.1 | (c) 2013 Greg Bergé | License MIT */

angular
.module('draganddrop', [])
.directive('draggable', ['$parse', draggableDirective])
.directive('drop', ['$parse', dropDirective]);

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
 */

function draggableDirective($parse) {
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var domElement = element[0];
      var effectAllowed = attrs.effectAllowed;
      var draggableData = attrs.draggableData;
      var draggableType = attrs.draggableType;

      var dragStartHandler = $parse(attrs.dragStart);
      var dragEndHandler = $parse(attrs.dragEnd);

      attrs.$observe('draggable', function (draggable) {
        domElement.draggable = draggable !== 'false';
      });

      domElement.addEventListener('dragstart', dragStartListener);
      domElement.addEventListener('dragend', dragEndListener);

      scope.$on('$destroy', function () {
        domElement.removeEventListener('dragstart', dragStartListener);
        domElement.removeEventListener('dragend', dragEndListener);
      });

      function dragStartListener(event) {
        // Restrict drag effect.
        event.dataTransfer.effectAllowed = effectAllowed || event.dataTransfer.effectAllowed;

        // Eval and serialize data.
        var data = scope.$eval(draggableData);
        var jsonData = angular.toJson(data);

        // Call dragStartHandler
        scope.$apply(function () {
          dragStartHandler(scope, { $data: data, $event: event });
        });

        // Set drag data and drag type.
        event.dataTransfer.setData('json/' + draggableType, jsonData);

        event.stopPropagation();
      }

      function dragEndListener(event) {
        // Eval and serialize data.
        var data = scope.$eval(draggableData);

        // Call dragEndHandler
        scope.$apply(function () {
          dragEndHandler(scope, { $data: data, $event: event });
        });

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
  return {
    restrict: 'A',
    link: function (scope, element, attrs) {
      var domElement = element[0];
      var dropEffect = attrs.dropEffect;
      var dropAccept = attrs.dropAccept;
      var dragOverClass = attrs.dragOverClass;

      var dragOverHandler = $parse(attrs.dragOver);
      var dragLeaveHandler = $parse(attrs.dragLeave);
      var dropHandler = $parse(attrs.drop);

      domElement.addEventListener('dragover', dragOverListener);
      domElement.addEventListener('dragleave', dragLeaveListener);
      domElement.addEventListener('drop', dropListener);

      scope.$on('$destroy', function () {
        domElement.removeEventListener('dragover', dragOverListener);
        domElement.removeEventListener('dragleave', dragLeaveListener);
        domElement.removeEventListener('drop', dropListener);
      });

      var throttledDragover = 0;

      function dragOverListener(event) {
        // Check if type is accepted.
        if (! accepts(scope.$eval(dropAccept), event)) return true;

        if (dragOverClass) element.addClass(dragOverClass);

        // Set up drop effect to link.
        event.dataTransfer.dropEffect = dropEffect || event.dataTransfer.dropEffect;

        // Prevent default to accept drag and drop.
        event.preventDefault();
        
        var now = new Date().getTime();
        if (now - throttledDragover < 200) return;
        throttledDragover = now;

        if (!attrs.dragOver) return;

        var data = getData(event);

        // Call dragOverHandler
        scope.$apply(function () {
          dragOverHandler(scope, { $data: data, $event: event });
        });
      }

      function dragLeaveListener(event) {
        // Check if type is accepted.
        if (! accepts(scope.$eval(dropAccept), event)) return true;

        removeDragOverClass();

        if (!attrs.dragLeave) return;

        var data = getData(event);

        // Call dragLeaveHandler
        scope.$apply(function () {
          dragLeaveHandler(scope, { $data: data, $event: event });
        });

        // Prevent default to accept drag and drop.
        event.preventDefault();
      }

      function dropListener(event) {
        var data = getData(event);

        removeDragOverClass();

        // Call dropHandler
        scope.$apply(function () {
          dropHandler(scope, { $data: data, $event: event });
        });

        // Prevent default navigator behaviour.
        event.preventDefault();
      }

      /**
       * Remove the drag over class.
       */

      function removeDragOverClass() {
        element.removeClass(dragOverClass);
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
