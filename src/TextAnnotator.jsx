import ReactDOM from 'react-dom';
import React, { Component } from 'react';
import { Editor } from '@recogito/recogito-client-core';
import Highlighter from './highlighter/Highlighter';
import SelectionHandler from './selection/SelectionHandler';

// Comment icons created by Smashicons - Flaticon
import CommentIcon from './icons/comment.svg';
// Quote icons created by Arafat Uddin - Flaticon<
import QuoteIcon from './icons/quote.svg';
// Trash can icons created by Md Tanvirul Haque - Flaticon
import TrashIcon from './icons/trash.svg';
// Copy icons created by Pixel perfect - Flaticon
import CopyIcon from './icons/copy.svg';

import './TextAnnotator.scss';

export const Colors = {
    safe: "#2196f3",
    orange: "#ff9800",
    purple: "#5e35b1",
    success: "#1DB954",
    primary_mid: "#FF6D6D",
};

/**
 * Pulls the strings between the annotation highlight layer
 * and the editor popup.
 */
export default class TextAnnotator extends Component {

    constructor(props) {
        super(props);

        this.state = {
            selectedAnnotation: null,
            selectedDOMElement: null,

            // ReadOnly mode
            readOnly: this.props.config.readOnly,

            widgets: [{
                force: 'PlainJS',
                widget: (args) => {
                    return this.colorSelectorWidget({
                        args,
                        linkvite: this.props.config.linkvite,
                        onDelete: this.onDeleteAnnotation,
                        onAddOrUpdate: this.addAnnotation,
                        onCreate: this.onCreateOrUpdateAnnotation('onAnnotationCreated'),
                        onUpdate: this.onCreateOrUpdateAnnotation('onAnnotationUpdated'),
                    });
                },
            }],

            // Headless mode
            editorDisabled: this.props.config.disableEditor,
        }

        this._editor = React.createRef();
    }


    /**
     * Function for creating and managing a color selector widget.
     *
     * @param {object} args - The arguments for the color selector widget
     * @param {object} linkvite - Props passed from linkvite
     * @param {function} onDelete - The function to handle deletion
     * @param {function} onAddOrUpdate - The function to handle adding or updating
     * @param {function} onCreate - The function to handle creation
     * @param {function} onUpdate - The function to handle update
     * @return {HTMLDivElement} The container element for the color selector widget
     */
    colorSelectorWidget({ args, linkvite, onDelete, onAddOrUpdate, onCreate, onUpdate }) {
        const target = args.annotation.clone();
        const container = document.createElement('div');
        container.className = 'colorselector-widget';

        // find the color setting in the annotation
        const currentColorBody = args.annotation ?
            args.annotation.bodies.find(function (b) {
                return b.purpose == 'highlighting';
            }) : null;

        const currentColorValue = currentColorBody ? currentColorBody.value : null;

        if (linkvite.autoHighlight.enabled && args.annotation.isSelection) {
            target.underlying.body = [{
                type: 'TextualBody',
                purpose: 'highlighting',
                value: linkvite.autoHighlight.color,
            }];

            closeOptionsModal();
            const delay = linkvite.autoHighlight.delay;
            const timeout = setTimeout(() => {
                onCreate(target.toAnnotation());
                clearTimeout(timeout);
            }, delay);
        }

        /**
         * Retrieves the annotation highlight color based on the specified value.
         *
         * @param {string} value - The value used to determine the annotation highlight color.
         * @return {string} The corresponding annotation highlight color.
         */
        function getHighlightColor(value) {
            switch (value) {
                case 'lv-highlighter-1':
                    return Colors.primary_mid;
                case 'lv-highlighter-2':
                    return Colors.safe;
                case 'lv-highlighter-3':
                    return Colors.success;
                case 'lv-highlighter-4':
                    return Colors.purple;
                case 'lv-highlighter-5':
                    return Colors.orange;
                default:
                    return Colors.primary;
            }
        }

        const selectors = [
            {
                class: "lv-highlighter-1",
                color: Colors.primary_mid,
            },
            {
                class: "lv-highlighter-2",
                color: Colors.safe,
            },
            {
                class: "lv-highlighter-3",
                color: Colors.success,
            },
            {
                class: "lv-highlighter-4",
                color: Colors.purple,
            },
            {
                class: "lv-highlighter-5",
                color: Colors.orange,
            }
        ];

        if (currentColorBody) {
            const newBody = {
                class: currentColorBody.value,
                color: getHighlightColor(currentColorBody.value),
            };

            const button = createButton({ selector: newBody });
            container.appendChild(button);
        } else {
            createColorSelector();
        }

        /**
         * Function to add a tag.
         *
         * @param {evt} evt - the event object
         * @return {void} 
         */
        function addTag(evt) {
            target.underlying.body = [{
                type: 'TextualBody',
                purpose: 'highlighting',
                value: evt.target.dataset.tag
            }];

            if (args.annotation.isSelection) {
                onCreate(target.toAnnotation());
            } else {
                onUpdate(target, args.annotation);
                onAddOrUpdate(target);
            }

            closeOptionsModal();
        }

        function createColorSelector(isEditing = false) {
            if (isEditing) {
                container.innerHTML = '';
            }

            for (const selector of selectors) {
                const button = createButton({ selector, isEditing });
                container.appendChild(button);
            }
        }

        /**
         * Creates a button element based on the given selector and returns it.
         *
         * @param {string} selector - The selector to create the button from
         * @return {HTMLButtonElement} The created button element
         */
        function createButton({ selector, isEditing = false }) {
            const button = document.createElement('button');
            button.className = 'color-selector';

            if (selector.class == currentColorValue) {
                button.className += ' selected';
            }

            button.dataset.tag = selector.class;
            button.style.backgroundColor = selector.color;

            button.autofocus = false;

            // if there is a currentColorBody, then we are editing.
            // so when the button is clicked, we show another modal
            // with the other colors to choose from.
            if (currentColorBody && !isEditing) {
                button.addEventListener('click', () => createColorSelector(true));
            } else {
                button.addEventListener('click', addTag);
            }

            return button;
        }

        /**
         * Closes the options modal.
         */
        function closeOptionsModal() {
            document.querySelector('.r6o-btn.outline')?.click();
        }

        const icons = [
            {
                name: 'quote',
                icon: QuoteIcon,
            },
            {
                name: 'copy',
                icon: CopyIcon,
            },
            {
                name: 'comment',
                icon: CommentIcon,
            },
            {
                name: 'delete',
                icon: TrashIcon,
            },
        ];

        if (currentColorBody) {
            for (const icon of icons) {
                const i = document.createElement('span');
                i.className = `action-${icon.name}-icon`;
                i.addEventListener('click', function () {
                    linkvite.sendMessage(`annotation:${icon.name}`, args.annotation.underlying);

                    if (icon.name == 'delete') {
                        onDelete(args.annotation.underlying);
                        return;
                    }

                    closeOptionsModal();
                });
                container.appendChild(i);
                ReactDOM.render(<icon.icon />, i);
            }
        }
        return container;
    }

    /** Shorthand **/
    clearState = () => {
        this.setState({
            selectedAnnotation: null,
            selectedDOMElement: null
        });

        this.selectionHandler.enabled = true;
    }

    handleEscape = (evt) => {
        if (evt.which === 27)
            this.onCancelAnnotation();
    }

    componentDidMount() {
        this.highlighter = new Highlighter(this.props.contentEl, this.props.config.linkvite);
        this.selectionHandler = new SelectionHandler(this.props.contentEl, this.highlighter, this.props.config.readOnly);
        this.selectionHandler.on('select', this.handleSelect);

        document.addEventListener('keydown', this.handleEscape);
    }

    componentWillUnmount() {
        document.removeEventListener('keydown', this.handleEscape);
    }

    onChanged = () => {
        // Disable selection outside of the editor 
        // when user makes the first change
        this.selectionHandler.enabled = false;
    }

    /**************************/
    /* Annotation CRUD events */
    /**************************/

    /** Selection on the text **/
    handleSelect = evt => this.onNormalSelect(evt);

    onNormalSelect = evt => {
        const { selection, element } = evt;
        if (selection) {
            this.setState({
                selectedAnnotation: null,
                selectedDOMElement: null
            }, () => this.setState({
                selectedAnnotation: selection,
                selectedDOMElement: element
            }));

            if (!selection.isSelection)
                this.props.onAnnotationSelected(selection.clone(), element);
        } else {
            this.clearState();
        }
    }

    /**
     * A convenience method that allows the external application to
     * override the autogenerated Id for an annotation.
     *
     * Usually, the override will happen almost immediately after
     * the annotation is created. But we need to be defensive and assume
     * that the override might come in with considerable delay, thus
     * the user might have made further edits already.
     *
     * A key challenge here is that there may be dependencies between
     * the original annotation that were created meanwhile.
     */
    overrideAnnotationId = originalAnnotation => forcedId => {
        const { id } = originalAnnotation;

        // Force the editors to close first, otherwise their annotations will be orphaned
        if (this.state.selectedAnnotation) {
            this.setState({
                selectedAnnotation: null
            }, () => {
                this.highlighter.overrideId(id, forcedId)
            });
        } else {
            this.highlighter.overrideId(id, forcedId);
        }
    }

    /** Common handler for annotation CREATE or UPDATE **/
    onCreateOrUpdateAnnotation = method => (annotation, previous) => {
        this.clearState();

        this.selectionHandler.clearSelection();

        const newAnnotation = this.onCleanAnnotation(annotation);
        this.highlighter.addOrUpdateAnnotation(newAnnotation, previous);

        if (previous) {
            this.props[method](annotation.clone(), previous.clone());
        } else {
            this.props[method](newAnnotation.clone(), this.overrideAnnotationId(annotation));
        }
    }

    onCleanAnnotation = annotation => {
        const hasBody = annotation.body.length > 0 && annotation.body[0].purpose === 'highlighting';

        return annotation.clone({
            ...annotation,
            id: annotation.id?.replace('#', ''),
            body: hasBody ? annotation.body : [{
                type: "TextualBody",
                purpose: "highlighting",
                value: "lv-highlighter-1",
            }]
        });
    };

    onDeleteAnnotation = annotation => {
        this.clearState();
        this.selectionHandler.clearSelection();
        this.highlighter.removeAnnotation(annotation);

        this.props.onAnnotationDeleted(annotation);
    }

    /** Cancel button on annotation editor **/
    onCancelAnnotation = annotation => {
        this.clearState();
        this.selectionHandler.clearSelection();
        this.props.onCancelSelected(annotation);
    }

    addAnnotation = annotation => {
        this.highlighter.addOrUpdateAnnotation(annotation.clone());
    }

    get disableSelect() {
        return !this.selectionHandler.enabled;
    }

    set disableSelect(disable) {
        if (disable)
            this.props.contentEl.classList.add('r6o-noselect');
        else
            this.props.contentEl.classList.remove('r6o-noselect');

        this.selectionHandler.enabled = !disable;
    }

    getAnnotations = () => {
        const annotations = this.highlighter.getAllAnnotations();
        return annotations.map(a => a.clone());
    }

    removeAnnotation = annotation => {
        this.highlighter.removeAnnotation(annotation);

        // If the editor is currently open on this annotation, close it
        const { selectedAnnotation } = this.state;
        if (selectedAnnotation && annotation.isEqual(selectedAnnotation))
            this.clearState();
    }

    selectAnnotation = arg => {
        // De-select in any case
        this.setState({
            selectedAnnotation: null,
            selectedDOMElement: null
        }, () => {
            if (arg) {
                const spans = this.highlighter.findAnnotationSpans(arg);

                if (spans.length > 0) {
                    const selectedDOMElement = spans[0];
                    const selectedAnnotation = spans[0].annotation;

                    this.setState({
                        selectedAnnotation,
                        selectedDOMElement
                    });
                }
            }
        });
    }

    setAnnotations = annotations => {
        this.highlighter.clear();

        const clones = annotations.map(a => a.clone());

        return this.highlighter.init(clones);
    }

    get readOnly() {
        return this.state.readOnly;
    }

    set readOnly(readOnly) {
        this.selectionHandler.readOnly = readOnly;
        this.setState({ readOnly });
    }

    get disableEditor() {
        return this.state.editorDisabled;
    }

    set disableEditor(disabled) {
        this.setState({ editorDisabled: disabled });
    }

    render() {
        // The editor should open under normal conditions - annotation was selected, no headless mode
        const open = this.state.selectedAnnotation && !this.state.editorDisabled;

        const readOnly = this.state.readOnly || this.state.selectedAnnotation?.readOnly;

        return (open && this.state.selectedAnnotation && (
            <Editor
                ref={this._editor}
                autoPosition={this.props.config.editorAutoPosition}
                wrapperEl={this.props.wrapperEl}
                annotation={this.state.selectedAnnotation}
                selectedElement={this.state.selectedDOMElement}
                readOnly={readOnly}
                allowEmpty={this.props.config.allowEmpty}
                widgets={this.state.widgets}
                onChanged={this.onChanged}
                onAnnotationCreated={this.onCreateOrUpdateAnnotation('onAnnotationCreated')}
                onAnnotationUpdated={this.onCreateOrUpdateAnnotation('onAnnotationUpdated')}
                onAnnotationDeleted={this.onDeleteAnnotation}
                onCancel={this.onCancelAnnotation} />
        ));
    }

}
