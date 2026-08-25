import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileUpload } from './FileUpload';

afterEach(cleanup);

function renderUploader() {
  const onDataParsed = vi.fn();
  const view = render(<FileUpload onDataParsed={onDataParsed} />);

  return { ...view, onDataParsed };
}

describe('FileUpload', () => {
  it('renders a CSV file input', () => {
    const { container } = renderUploader();

    const input = container.querySelector('input[type="file"]');

    expect(input).not.toBeNull();
  });

  it('limits the input to CSV files', () => {
    const { container } = renderUploader();

    const input = container.querySelector<HTMLInputElement>('input[type="file"]');

    expect(input?.accept).toBe('.csv');
  });

  it('renders a Select File button', () => {
    renderUploader();

    expect(screen.getByRole('button', { name: 'Select File' })).toBeTruthy();
  });

  it('clicking Select File activates its file input', () => {
    const { container } = renderUploader();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    const click = vi.spyOn(input!, 'click');

    fireEvent.click(screen.getByRole('button', { name: 'Select File' }));

    expect(click).toHaveBeenCalledOnce();
  });

  it('renders a separate input for each uploader instance', () => {
    const { container } = render(
      <>
        <FileUpload onDataParsed={vi.fn()} />
        <FileUpload onDataParsed={vi.fn()} />
      </>,
    );

    expect(container.querySelectorAll('input[type="file"]')).toHaveLength(2);
  });

  it('renders multiple uploader inputs without duplicate IDs', () => {
    const { container } = render(
      <>
        <FileUpload onDataParsed={vi.fn()} />
        <FileUpload onDataParsed={vi.fn()} />
      </>,
    );

    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));

    expect(inputs.every((input) => input.id !== 'file-upload')).toBe(true);
  });

  it('activates only the first input when the first uploader button is clicked', () => {
    const { container } = render(
      <>
        <FileUpload onDataParsed={vi.fn()} />
        <FileUpload onDataParsed={vi.fn()} />
      </>,
    );
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    const firstClick = vi.spyOn(inputs[0], 'click');
    const secondClick = vi.spyOn(inputs[1], 'click');

    fireEvent.click(screen.getAllByRole('button', { name: 'Select File' })[0]);

    expect(firstClick).toHaveBeenCalledOnce();
    expect(secondClick).not.toHaveBeenCalled();
  });

  it('activates only the second input when the second uploader button is clicked', () => {
    const { container } = render(
      <>
        <FileUpload onDataParsed={vi.fn()} />
        <FileUpload onDataParsed={vi.fn()} />
      </>,
    );
    const inputs = Array.from(container.querySelectorAll<HTMLInputElement>('input[type="file"]'));
    const firstClick = vi.spyOn(inputs[0], 'click');
    const secondClick = vi.spyOn(inputs[1], 'click');

    fireEvent.click(screen.getAllByRole('button', { name: 'Select File' })[1]);

    expect(firstClick).not.toHaveBeenCalled();
    expect(secondClick).toHaveBeenCalledOnce();
  });

  it('shows an error for a non-CSV file', () => {
    const { container } = renderUploader();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['battery data'], 'battery.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('Please select a CSV file')).toBeTruthy();
  });

  it('shows an error for a CSV file larger than 10MB', () => {
    const { container } = renderUploader();
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'battery.csv', {
      type: 'text/csv',
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByText('File size must be less than 10MB')).toBeTruthy();
  });
});
