import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { createFFmpeg, fetchFile, FFmpeg } from '@ffmpeg/ffmpeg';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ height: '0', width: '0', opacity: 0, overflow: 'hidden' }),
        animate('300ms 151ms ease-in-out', style({ height: '*', width: '*' })), // Start after leave completes
        animate('300ms 451ms ease-in-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', width: '*', opacity: 1, overflow: 'hidden' }),
        animate('150ms ease-in-out', style({ opacity: 0 })),
        animate('300ms 150ms ease-in-out', style({ height: '0', width: '0'})), // Total: 450ms
      ])
    ])
  ]
})
export class App implements OnInit {
  ffmpeg!: FFmpeg;
  loading = false;
  selectedFile: File | null = null;
  selectedFilePath: string = '';
  quality: 'low' | 'medium' | 'high' | 'deep-fried' = 'high';

  ngOnInit() {
    this.load();
    document.getElementById("drag-and-drop")!.addEventListener("drop", this.dropHandler);
    document.getElementById("drag-and-drop")!.addEventListener("dragover", this.dragOverHandler);
  }

  load = (): Promise<void> => {
    this.ffmpeg = createFFmpeg();
    return this.ffmpeg.load().then(() => {
      return Promise.resolve();
    })
    .catch((error) => {
      return Promise.reject(new Error(`Failed to load FFmpeg: ${error.message}`));
    });
  }

  setQuality = (quality: 'low' | 'medium' | 'high' | 'deep-fried') => this.quality = quality;

  selectVideoFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        this.selectedFile = target.files[0];
        this.selectedFilePath = this.selectedFile.name;
        console.log('Selected file:', this.selectedFilePath);
        console.log('File size:', this.selectedFile.size, 'bytes');
        this.compressVideo();
      }
    };
    input.click();
  }

  getCrfValue = () => {
    switch (this.quality) {
      case 'low':
        return '28';
      case 'medium':
        return '23';
      case 'high':
        return '18';
      case 'deep-fried':
        return '51';
      default:
        return '23';
    }
  }

  compressVideo = async () => {
    this.loading = true;

    this.ffmpeg.FS('writeFile', 'input.mp4', await fetchFile(this.selectedFile));

    await this.ffmpeg.run(
      '-i', 'input.mp4',
      '-vcodec', 'libx264',
      '-crf', this.getCrfValue(),
      'output.mp4'
    );
  
    const videoURL = URL.createObjectURL(new Blob([this.ffmpeg.FS('readFile', 'output.mp4').buffer], { type: 'video/mp4' }));

    this.downloadFile(videoURL, `compressed_${this.selectedFile!.name}`);
  }

  downloadFile = (url: string, filename: string)  => {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.loading = false;
    
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  }

  dropHandler = (ev: any) => {
    ev.preventDefault();
  
    let droppedFile: File | null = null;
  
    if (ev.dataTransfer.items) {
      for (let i = 0; i < ev.dataTransfer.items.length; i++) {
        const item = ev.dataTransfer.items[i];
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file && file.type.startsWith('video/')) {
            droppedFile = file;
            break;
          }
        }
      }
    } else {
      for (let i = 0; i < ev.dataTransfer.files.length; i++) {
        const file = ev.dataTransfer.files[i];
        if (file.type.startsWith('video/')) {
          droppedFile = file;
          break;
        }
      }
    }
  
    if (droppedFile
        && droppedFile.type.startsWith('video/')
        && (droppedFile.size > 0 && droppedFile.size < 209715200)
        && droppedFile.name.match(/\.(mp4|mov)$/i))
    {
      this.selectedFile = droppedFile;
      this.selectedFilePath = this.selectedFile.name;
      this.compressVideo();
    } else {
      alert('Invalid file type or size. Please drop a valid video file (MP4 or MOV) under 200MB.');
    }
  }

  dragOverHandler = (ev: any) => {
    ev.preventDefault();
  }
}