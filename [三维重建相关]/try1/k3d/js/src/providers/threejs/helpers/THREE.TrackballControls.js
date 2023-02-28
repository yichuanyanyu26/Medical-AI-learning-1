/* eslint-disable */

module.exports = function (THREE) {
    THREE.TrackballControls = function (object, domElement) {
        const scope = this;
        const STATE = {
            NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2, TOUCH_ROTATE: 3, TOUCH_ZOOM_PAN: 4,
        };

        this.object = object;

        let currentWindow;
        let currentDocument;

        if (domElement !== undefined) {
            currentWindow = domElement.ownerDocument.defaultView || domElement.ownerDocument.parentWindow;
            this.domElement = domElement;
            currentDocument = domElement.ownerDocument;
        } else {
            currentWindow = window;
            this.domElement = currentWindow.document;
            currentDocument = currentWindow.document;
        }

        this.domElement.style.touchAction = 'none'; // disable touch scroll

        // API

        this.enabled = true;

        this.screen = {
            left: 0, top: 0, width: 0, height: 0,
        };

        this.rotateSpeed = 1.0;
        this.zoomSpeed = 1.2;
        this.panSpeed = 0.3;

        this.noRotate = false;
        this.noZoom = false;
        this.noPan = false;

        this.staticMoving = false;
        this.dynamicDampingFactor = 0.2;

        this.minDistance = 0;
        this.maxDistance = Infinity;

        this.mouseButtons = {LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN};

        // internals

        this.target = new THREE.Vector3();

        const EPS = 0.0000000001;

        const lastPosition = new THREE.Vector3();
        const lastUp = new THREE.Vector3();
        let lastZoom = 1;

        let _state = STATE.NONE;
        let _keyState = STATE.NONE;

        let _touchZoomDistanceStart = 0;
        let _touchZoomDistanceEnd = 0;

        let _lastAngle = 0;

        const _eye = new THREE.Vector3();

        const _movePrev = new THREE.Vector2();
        const _moveCurr = new THREE.Vector2();

        const _lastAxis = new THREE.Vector3();

        const _zoomStart = new THREE.Vector2();
        const _zoomEnd = new THREE.Vector2();

        const _panStart = new THREE.Vector2();
        const _panEnd = new THREE.Vector2();

        this._pointerPositions = {};
        this._pointers = [];

        // for reset

        this.target0 = this.target.clone();
        this.position0 = this.object.position.clone();
        this.up0 = this.object.up.clone();
        this.zoom0 = this.object.zoom;

        // events

        const _changeEvent = {type: 'change'};
        const _startEvent = {type: 'start'};
        const _endEvent = {type: 'end'};

        // methods

        this.handleResize = function () {
            if (this.domElement === currentDocument) {
                this.screen.left = 0;
                this.screen.top = 0;
                this.screen.width = currentWindow.innerWidth;
                this.screen.height = currentWindow.innerHeight;
            } else {
                const box = scope.domElement.getBoundingClientRect();
                // adjustments come from similar code in the jquery offset() function
                const d = scope.domElement.ownerDocument.documentElement;
                this.screen.left = box.left + currentWindow.pageXOffset - d.clientLeft;
                this.screen.top = box.top + currentWindow.pageYOffset - d.clientTop;
                this.screen.width = box.width;
                this.screen.height = box.height;
            }
        };

        const getMouseOnScreen = (function () {
            const vector = new THREE.Vector2();

            return function (x, y) {
                vector.set(
                    x / scope.screen.width,
                    y / scope.screen.height,
                );

                return vector;
            };
        }());

        const getMouseOnCircle = (function () {
            const vector = new THREE.Vector2();

            return function (x, y) {
                vector.set(
                    ((x - scope.screen.width * 0.5) / (scope.screen.width * 0.5)),
                    ((scope.screen.height - 2 * y) / scope.screen.width),
                );

                return vector;
            };
        }());

        this.rotateCamera = (function () {
            const axis = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const eyeDirection = new THREE.Vector3();
            const objectUpDirection = new THREE.Vector3();
            const objectSidewaysDirection = new THREE.Vector3();
            const moveDirection = new THREE.Vector3();

            return function rotateCamera() {
                moveDirection.set(_moveCurr.x - _movePrev.x, _moveCurr.y - _movePrev.y, 0);
                let angle = moveDirection.length();

                if (angle) {
                    _eye.copy(scope.object.position).sub(scope.target);

                    eyeDirection.copy(_eye).normalize();
                    objectUpDirection.copy(scope.object.up).normalize();
                    objectSidewaysDirection.crossVectors(objectUpDirection, eyeDirection).normalize();

                    objectUpDirection.setLength(_moveCurr.y - _movePrev.y);
                    objectSidewaysDirection.setLength(_moveCurr.x - _movePrev.x);

                    moveDirection.copy(objectUpDirection.add(objectSidewaysDirection));

                    axis.crossVectors(moveDirection, _eye).normalize();

                    angle *= scope.rotateSpeed;
                    quaternion.setFromAxisAngle(axis, angle);

                    _eye.applyQuaternion(quaternion);
                    scope.object.up.applyQuaternion(quaternion);

                    _lastAxis.copy(axis);
                    _lastAngle = angle;
                } else if (!scope.staticMoving && _lastAngle) {
                    _lastAngle *= Math.sqrt(1.0 - scope.dynamicDampingFactor);
                    _eye.copy(scope.object.position).sub(scope.target);
                    quaternion.setFromAxisAngle(_lastAxis, _lastAngle);
                    _eye.applyQuaternion(quaternion);
                    scope.object.up.applyQuaternion(quaternion);
                }

                _movePrev.copy(_moveCurr);
            };
        }());

        this.zoomCamera = function () {
            let factor;

            if (_state === STATE.TOUCH_ZOOM_PAN) {
                factor = _touchZoomDistanceStart / _touchZoomDistanceEnd;
                _touchZoomDistanceStart = _touchZoomDistanceEnd;

                if (scope.object.isPerspectiveCamera) {
                    _eye.multiplyScalar(factor);
                } else if (scope.object.isOrthographicCamera) {
                    scope.object.zoom *= factor;
                    scope.object.updateProjectionMatrix();
                } else {
                    console.warn('THREE.TrackballControls: Unsupported camera type');
                }
            } else {
                if (scope.flyMode || _state === STATE.PAN || _keyState === STATE.PAN) {
                    return;
                }

                factor = 1.0 + (_zoomEnd.y - _zoomStart.y) * scope.zoomSpeed;

                if (factor !== 1.0 && factor > 0.0) {
                    if (scope.object.isPerspectiveCamera) {
                        _eye.multiplyScalar(factor);
                    } else if (scope.object.isOrthographicCamera) {
                        scope.object.zoom /= factor;
                        scope.object.updateProjectionMatrix();
                    } else {
                        console.warn('THREE.TrackballControls: Unsupported camera type');
                    }
                }

                if (scope.staticMoving) {
                    _zoomStart.copy(_zoomEnd);
                } else {
                    _zoomStart.y += (_zoomEnd.y - _zoomStart.y) * scope.dynamicDampingFactor;
                }
            }
        };

        this.panCamera = (function () {
            const mouseChange = new THREE.Vector3();
            const objectUp = new THREE.Vector3();
            const zAxis = new THREE.Vector3();
            const pan = new THREE.Vector3();

            return function panCamera() {
                mouseChange.copy(_panEnd).sub(_panStart);
                mouseChange.z = 0.0;

                if (scope.flyMode || _state === STATE.PAN || _keyState === STATE.PAN) {
                    mouseChange.z = (_zoomEnd.y - _zoomStart.y) * scope.panSpeed * 10.0;

                    if (scope.staticMoving) {
                        _zoomStart.copy(_zoomEnd);
                    } else {
                        _zoomStart.y += (_zoomEnd.y - _zoomStart.y) * scope.dynamicDampingFactor;
                    }
                }

                if (mouseChange.lengthSq()) {
                    if (scope.object.isOrthographicCamera) {
                        const scaleX = (scope.object.right - scope.object.left) / scope.object.zoom
                            / scope.domElement.clientWidth;
                        const scaleY = (scope.object.top - scope.object.bottom) / scope.object.zoom
                            / scope.domElement.clientWidth;

                        mouseChange.x *= scaleX;
                        mouseChange.y *= scaleY;
                    }

                    mouseChange.multiplyScalar(_eye.length() * scope.panSpeed);

                    pan.copy(_eye).cross(scope.object.up).setLength(mouseChange.x);
                    pan.add(objectUp.copy(scope.object.up).setLength(mouseChange.y));
                    pan.add(zAxis.copy(_eye).setLength(mouseChange.z));

                    scope.object.position.add(pan);
                    scope.target.add(pan);

                    if (scope.staticMoving) {
                        _panStart.copy(_panEnd);
                    } else {
                        _panStart.add(mouseChange.subVectors(_panEnd, _panStart)
                            .multiplyScalar(scope.dynamicDampingFactor));
                    }
                }
            };
        }());

        this.checkDistances = function () {
            if (!scope.noZoom || !scope.noPan) {
                if (_eye.lengthSq() > scope.maxDistance * scope.maxDistance) {
                    scope.object.position.addVectors(scope.target, _eye.setLength(scope.maxDistance));
                    _zoomStart.copy(_zoomEnd);
                }

                if (_eye.lengthSq() < scope.minDistance * scope.minDistance) {
                    scope.object.position.addVectors(scope.target, _eye.setLength(scope.minDistance));
                    _zoomStart.copy(_zoomEnd);
                }
            }
        };

        this.update = function (silent) {
            _eye.subVectors(scope.object.position, scope.target);

            if (!scope.noRotate) {
                scope.rotateCamera();
            }

            if (!scope.noZoom) {
                scope.zoomCamera();
            }

            if (!scope.noPan) {
                scope.panCamera();
            }

            scope.object.position.addVectors(scope.target, _eye);

            if (scope.object.isPerspectiveCamera) {
                scope.checkDistances();
                scope.object.lookAt(scope.target);

                if (lastPosition.distanceToSquared(scope.object.position) > EPS
                    || lastUp.distanceToSquared(scope.object.up) > EPS) {
                    lastPosition.copy(scope.object.position);
                    lastUp.copy(scope.object.up);

                    if (!silent) {
                        scope.dispatchEvent(_changeEvent);
                    }

                    lastPosition.copy(scope.object.position);
                }
            } else if (scope.object.isOrthographicCamera) {
                scope.object.lookAt(scope.target);

                if (lastPosition.distanceToSquared(scope.object.position) > EPS || lastZoom !== scope.object.zoom) {
                    if (!silent) {
                        scope.dispatchEvent(_changeEvent);
                    }
                    lastPosition.copy(scope.object.position);
                    lastZoom = scope.object.zoom;
                }
            } else {
                console.warn('THREE.TrackballControls: Unsupported camera type');
            }
        };

        this.reset = function () {
            _state = STATE.NONE;
            _keyState = STATE.NONE;

            scope.target.copy(scope.target0);
            scope.object.position.copy(scope.position0);
            scope.object.up.copy(scope.up0);
            scope.object.zoom = scope.zoom0;

            scope.object.updateProjectionMatrix();

            _eye.subVectors(scope.object.position, scope.target);

            scope.object.lookAt(scope.target);

            scope.dispatchEvent(_changeEvent);

            lastPosition.copy(scope.object.position);
            lastUp.copy(scope.object.up);
            lastZoom = scope.object.zoom;
        };

        // listeners

        function onPointerDown(event) {
            if (scope.enabled === false) return;

            if (scope._pointers.length === 0) {
                scope.domElement.setPointerCapture(event.pointerId);

                scope.domElement.addEventListener('pointermove', onPointerMove);
                scope.domElement.addEventListener('pointerup', onPointerUp);
            }

            addPointer(event);

            if (event.pointerType === 'touch') {
                onTouchStart(event);
            } else {
                onMouseDown(event);
            }
        }

        function onPointerMove(event) {
            if (scope.enabled === false) return;

            if (event.pointerType === 'touch') {
                onTouchMove(event);
            } else {
                onMouseMove(event);
            }
        }

        function onPointerUp(event) {
            if (scope.enabled === false) return;

            if (event.pointerType === 'touch') {
                onTouchEnd(event);
            } else {
                onMouseUp();
            }
            removePointer(event);

            if (scope._pointers.length === 0) {
                scope.domElement.releasePointerCapture(event.pointerId);

                scope.domElement.removeEventListener('pointermove', onPointerMove);
                scope.domElement.removeEventListener('pointerup', onPointerUp);
            }
        }

        function onPointerCancel(event) {
            removePointer(event);
        }

        function keydown(event) {
            if (scope.enabled === false) return;

            currentWindow.removeEventListener('keydown', keydown);

            if (_keyState !== STATE.NONE) {
                // nothing
            } else if (event.ctrlKey && !scope.noRotate) {
                _keyState = STATE.ROTATE;
            } else if (event.altKey && !scope.noZoom) {
                _keyState = STATE.ZOOM;
            } else if (event.shiftKey && !scope.noPan) {
                _keyState = STATE.PAN;
            }
        }

        function keyup() {
            if (scope.enabled === false) return;

            _keyState = STATE.NONE;

            currentWindow.addEventListener('keydown', keydown);
        }

        function onMouseDown(event) {
            if (_state === STATE.NONE) {
                switch (event.button) {
                    case scope.mouseButtons.LEFT:
                        _state = STATE.ROTATE;
                        break;

                    case scope.mouseButtons.MIDDLE:
                        _state = STATE.ZOOM;
                        break;

                    case scope.mouseButtons.RIGHT:
                        _state = STATE.PAN;
                        break;

                    default:
                        _state = STATE.NONE;
                }
            }

            const state = (_keyState !== STATE.NONE) ? _keyState : _state;

            if (state === STATE.ROTATE && !scope.noRotate) {
                _moveCurr.copy(getMouseOnCircle(event.offsetX, event.offsetY));
                _movePrev.copy(_moveCurr);
            } else if (state === STATE.ZOOM && !scope.noZoom) {
                _zoomStart.copy(getMouseOnScreen(event.offsetX, event.offsetY));
                _zoomEnd.copy(_zoomStart);
            } else if (state === STATE.PAN && !scope.noPan) {
                _panStart.copy(getMouseOnScreen(event.offsetX, event.offsetY));
                _panEnd.copy(_panStart);
            }

            scope.dispatchEvent(_startEvent);
        }

        function onMouseMove(event) {
            if (scope.enabled === false) return;

            const state = (_keyState !== STATE.NONE) ? _keyState : _state;

            if (state === STATE.ROTATE && !scope.noRotate) {
                _movePrev.copy(_moveCurr);
                _moveCurr.copy(getMouseOnCircle(event.offsetX, event.offsetY));
            } else if (state === STATE.ZOOM && !scope.noZoom) {
                _zoomEnd.copy(getMouseOnScreen(event.offsetX, event.offsetY));
            } else if (state === STATE.PAN && !scope.noPan) {
                _panEnd.copy(getMouseOnScreen(event.offsetX, event.offsetY));
            }
        }

        function onMouseUp() {
            _state = STATE.NONE;
            scope.dispatchEvent(_endEvent);
        }

        function onMouseWheel(event) {
            if (scope.enabled === false) return;

            if (scope.noZoom === true) return;

            event.preventDefault();

            switch (event.deltaMode) {
                case 2:
                    // Zoom in pages
                    _zoomStart.y -= event.deltaY * 0.025;
                    break;

                case 1:
                    // Zoom in lines
                    _zoomStart.y -= event.deltaY * 0.01;
                    break;

                default:
                    // undefined, 0, assume pixels
                    _zoomStart.y -= event.deltaY * 0.00025;
                    break;
            }

            scope.dispatchEvent(_startEvent);
            scope.dispatchEvent(_endEvent);
        }

        function onTouchStart(event) {
            trackPointer(event);

            switch (scope._pointers.length) {
                case 1:
                    _state = STATE.TOUCH_ROTATE;
                    _moveCurr.copy(getMouseOnCircle(scope._pointers[0].pageX, scope._pointers[0].pageY));
                    _movePrev.copy(_moveCurr);
                    break;

                default: // 2 or more
                    _state = STATE.TOUCH_ZOOM_PAN;
                    const dx = scope._pointers[0].pageX - scope._pointers[1].pageX;
                    const dy = scope._pointers[0].pageY - scope._pointers[1].pageY;
                    _touchZoomDistanceEnd = _touchZoomDistanceStart = Math.sqrt(dx * dx + dy * dy);

                    const x = (scope._pointers[0].pageX + scope._pointers[1].pageX) / 2;
                    const y = (scope._pointers[0].pageY + scope._pointers[1].pageY) / 2;
                    _panStart.copy(getMouseOnScreen(x, y));
                    _panEnd.copy(_panStart);
                    break;
            }

            scope.dispatchEvent(_startEvent);
        }

        function onTouchMove(event) {
            trackPointer(event);

            switch (scope._pointers.length) {
                case 0:
                    break;
                case 1:
                    _movePrev.copy(_moveCurr);
                    _moveCurr.copy(getMouseOnCircle(event.offsetX, event.offsetY));
                    break;

                default: // 2 or more
                    const position = getSecondPointerPosition(event);

                    const dx = event.offsetX - position.x;
                    const dy = event.offsetY - position.y;
                    _touchZoomDistanceEnd = Math.sqrt(dx * dx + dy * dy);

                    const x = (event.offsetX + position.x) / 2;
                    const y = (event.offsetY + position.y) / 2;
                    _panEnd.copy(getMouseOnScreen(x, y));
                    break;
            }
        }

        function onTouchEnd(event) {
            switch (scope._pointers.length) {
                case 0:
                    _state = STATE.NONE;
                    break;

                case 1:
                    _state = STATE.TOUCH_ROTATE;
                    _moveCurr.copy(getMouseOnCircle(event.offsetX, event.offsetY));
                    _movePrev.copy(_moveCurr);
                    break;

                case 2:
                    _state = STATE.TOUCH_ZOOM_PAN;
                    _moveCurr.copy(getMouseOnCircle(event.offsetX - _movePrev.pageX, event.offsetY - _movePrev.pageY));
                    _movePrev.copy(_moveCurr);
                    break;
            }

            scope.dispatchEvent(_endEvent);
        }

        function contextmenu(event) {
            if (scope.enabled === false) return;

            event.preventDefault();
        }

        function addPointer(event) {
            scope._pointers.push(event);
        }

        function removePointer(event) {
            delete scope._pointerPositions[event.pointerId];

            for (let i = 0; i < scope._pointers.length; i++) {
                if (scope._pointers[i].pointerId == event.pointerId) {
                    scope._pointers.splice(i, 1);
                    return;
                }
            }
        }

        function trackPointer(event) {
            let position = scope._pointerPositions[event.pointerId];

            if (position === undefined) {
                position = new THREE.Vector2();
                scope._pointerPositions[event.pointerId] = position;
            }

            position.set(event.offsetX, event.offsetY);
        }

        function getSecondPointerPosition(event) {
            const pointer = (event.pointerId === scope._pointers[0].pointerId) ? scope._pointers[1] : scope._pointers[0];

            return scope._pointerPositions[pointer.pointerId];
        }

        this.dispose = function () {
            scope.domElement.removeEventListener('contextmenu', contextmenu);

            scope.domElement.removeEventListener('pointerdown', onPointerDown);
            scope.domElement.removeEventListener('pointercancel', onPointerCancel);
            scope.domElement.removeEventListener('wheel', onMouseWheel);

            scope.domElement.removeEventListener('pointermove', onPointerMove);
            scope.domElement.removeEventListener('pointerup', onPointerUp);

            currentDocument.removeEventListener('keydown', keydown);
            currentDocument.removeEventListener('keyup', keyup);
        };

        this.domElement.addEventListener('pointerdown', onPointerDown);
        this.domElement.addEventListener('pointercancel', onPointerCancel);
        this.domElement.addEventListener('wheel', onMouseWheel, {passive: false});
        this.domElement.addEventListener('contextmenu', contextmenu);

        currentDocument.addEventListener('keydown', keydown);
        currentDocument.addEventListener('keyup', keyup);

        this.handleResize();

        // force an update at start
        this.update();
    };

    THREE.TrackballControls.prototype = Object.create(THREE.EventDispatcher.prototype);
    THREE.TrackballControls.prototype.constructor = THREE.TrackballControls;
};
